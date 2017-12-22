const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { Router } from './../../src/Router';
import { MemoryHistory } from './../../src/MemoryHistory';

const routeConfig = [
	{
		path: '/',
		outlet: 'home'
	},
	{
		path: '/foo',
		outlet: 'foo',
		children: [
			{
				path: '/bar',
				outlet: 'bar'
			},
			{
				path: '/{baz}/baz',
				outlet: 'baz'
			}
		]
	}
];

const routeConfigNoRoot = [
	{
		path: '/foo',
		outlet: 'foo'
	}
];

const routeConfigDefaultRoute = [
	{
		path: '/foo/{bar}',
		outlet: 'foo',
		defaultRoute: true,
		defaultParams: {
			bar: 'defaultBar'
		}
	}
];

const routeConfigDefaultRouteNoDefaultParams = [
	{
		path: '/foo/{bar}',
		outlet: 'foo',
		defaultRoute: true
	}
];

const routeWithChildrenAndMultipleParams = [
	{
		path: '/foo/{foo}',
		outlet: 'foo',
		children: [
			{
				path: '/bar/{bar}',
				outlet: 'bar',
				children: [
					{
						path: '/baz/{baz}',
						outlet: 'baz'
					}
				]
			}
		]
	}
];

describe('Router', () => {

	it('Navigates to current route if matches against a registered outlet', () => {
		const router = new Router(MemoryHistory, routeConfig);
		const context = router.getOutlet('home');
		assert.isOk(context);
	});

	it('Navigates to default route if current route does not matches against a registered outlet', () => {
		const router = new Router(MemoryHistory, routeConfigDefaultRoute);
		const context = router.getOutlet('foo');
		assert.isOk(context);
	});

	it('Navigates to global "errorOutlet" if current route does not match a registered outlet and no default route is configured', () => {
		const router = new Router(MemoryHistory, routeConfigNoRoot);
		const context = router.getOutlet('errorOutlet');
		assert.isOk(context);
		assert.deepEqual(context!.params, {});
		assert.deepEqual(context!.queryParams, {});
		assert.deepEqual(context!.type, 'error');
	});

	it('Should navigates to global "errorOutlet" if default route requires params but none have been provided', () => {
		const router = new Router(MemoryHistory, routeConfigDefaultRouteNoDefaultParams);
		const fooContext = router.getOutlet('foo');
		assert.isNotOk(fooContext);
		const errorContext = router.getOutlet('errorOutlet');
		assert.isOk(errorContext);
		assert.deepEqual(errorContext!.params, {});
		assert.deepEqual(errorContext!.queryParams, {});
		assert.deepEqual(errorContext!.type, 'error');
	});

	it('Should register as an exact match for an outlet that exact matches the route', () => {
		const router = new Router(MemoryHistory, routeConfig);
		router.setPath('/foo');
		const context = router.getOutlet('foo');
		assert.isOk(context);
		assert.deepEqual(context!.params, {});
		assert.deepEqual(context!.queryParams, {});
		assert.deepEqual(context!.type, 'exact');
	});

	it('Should register as a partial match for an outlet that matches a section of the route', () => {
		const router = new Router(MemoryHistory, routeConfig);
		router.setPath('/foo/bar');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'partial');
		const barContext = router.getOutlet('bar');
		assert.isOk(barContext);
		assert.deepEqual(barContext!.params, {});
		assert.deepEqual(barContext!.queryParams, {});
		assert.deepEqual(barContext!.type, 'exact');
	});

	it('Should register as a error match for an outlet that matches a section of the route with no further matching registered outlets', () => {
		const router = new Router(MemoryHistory, routeConfig);
		router.setPath('/foo/unknown');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'error');
		const barContext = router.getOutlet('bar');
		assert.isNotOk(barContext);
	});

	it('Matches routes against outlets with params', () => {
		const router = new Router(MemoryHistory, routeConfig);
		router.setPath('/foo/baz/baz');
		const fooContext = router.getOutlet('foo');
		assert.isOk(fooContext);
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, {});
		assert.deepEqual(fooContext!.type, 'partial');
		const context = router.getOutlet('baz');
		assert.isOk(context);
		assert.deepEqual(context!.params, { baz: 'baz' });
		assert.deepEqual(context!.queryParams, {});
		assert.deepEqual(context!.type, 'exact');
	});

	it('Should pass query params to all matched outlets', () => {
		const router = new Router(MemoryHistory, routeConfig);
		router.setPath('/foo/bar?query=true');
		const fooContext = router.getOutlet('foo');
		assert.deepEqual(fooContext!.params, {});
		assert.deepEqual(fooContext!.queryParams, { query: 'true' });
		assert.deepEqual(fooContext!.type, 'partial');
		const barContext = router.getOutlet('bar');
		assert.deepEqual(barContext!.params, {});
		assert.deepEqual(barContext!.queryParams, { query: 'true' });
		assert.deepEqual(barContext!.type, 'exact');
	});

	it('Should return all params for a route', () => {
		const router = new Router(MemoryHistory, routeWithChildrenAndMultipleParams);
		router.setPath('/foo/foo/bar/bar/baz/baz');
		assert.deepEqual(router.currentParams, {
			foo: 'foo',
			bar: 'bar',
			baz: 'baz'
		});
	});

	it('Should create link using current params', () => {
		const router = new Router(MemoryHistory, routeWithChildrenAndMultipleParams);
		router.setPath('/foo/foo/bar/bar/baz/baz');
		const link = router.link('baz');
		assert.strictEqual(link, 'foo/foo/bar/bar/baz/baz');
	});

	it('Will not generate a link if params are not available', () => {
		const router = new Router(MemoryHistory, routeWithChildrenAndMultipleParams);
		const link = router.link('baz');
		assert.isUndefined(link);
	});

	it('Should use params passed to generate link', () => {
		const router = new Router(MemoryHistory, routeWithChildrenAndMultipleParams);
		router.setPath('/foo/foo/bar/bar/baz/baz');
		const link = router.link('baz', { bar: 'bar1' });
		assert.strictEqual(link, 'foo/foo/bar/bar1/baz/baz');
	});

	it('Should return undefined from link if there is a missing param', () => {
		const router = new Router(MemoryHistory, routeWithChildrenAndMultipleParams);
		const link = router.link('baz', { bar: 'bar1' });
		assert.isUndefined(link);
	});

	it('Should fallback to default params if params are not passed and no matching current params', () => {
		const router = new Router(MemoryHistory, routeConfigDefaultRoute);
		const link = router.link('foo');
		assert.strictEqual(link, 'foo/defaultBar');
	});

	it('Cannot generate link for an unknown outlet', () => {
		const router = new Router(MemoryHistory, routeConfigDefaultRoute);
		const link = router.link('unknown');
		assert.isUndefined(link);
	});

});
