import { Evented } from '@dojo/core/Evented';
import { Constructor } from '@dojo/widget-core/interfaces';
import {
	Config,
	History,
	MatchType,
	OutletContext,
	Params,
	RouterInterface,
	Route
} from './interfaces';

const PARAM = Symbol('routing param');

export class Router extends Evented implements RouterInterface {
	private _routes: Route[] = [];
	private _outletMap: { [index: string]: Route } = Object.create(null);
	private _matchedOutlets: { [index: string]: OutletContext } = Object.create(null);
	private _currentParams: Params = {};
	private _defaultOutlet: string;
	private _history: History;

	constructor(HistoryManager: Constructor<History>, config: Config[]) {
		super();
		this._register(config);
		this._history = new HistoryManager(this._onChange.bind(this));
		if (this._matchedOutlets.errorOutlet && this._defaultOutlet) {
			const path = this.link(this._defaultOutlet);
			if (path) {
				this.setPath(path);
			}
		}
	}

	public setPath(path: string): void {
		this._history.set(path);
	}

	public link(outlet: string, params: Params = {}): string | undefined {
		let route = this._outletMap[outlet];
		if (route === undefined) {
			return;
		}

		let linkPath = route.fullPath;
		params = { ...route.defaultParams, ...this._currentParams, ...params };

		for (let i = 0; i < route.fullParams.length; i++) {
			const param = route.fullParams[i];
			if (params[param]) {
				linkPath = linkPath.replace(`{${param}}`, params[param]);
			}
		}
		return this._history.prefix(linkPath);
	}

	public getOutlet(path: string): OutletContext | undefined {
		return this._matchedOutlets[path];
	}

	public get currentParams() {
		return this._currentParams;
	}

	private _stripLeadingSlash(path: string): string {
		if (path[0] === '/') {
			return path.slice(1);
		}
		return path;
	}

	private _register(config: Config[], routes?: Route[], parentRoute?: Route): void {
		routes = routes ? routes : this._routes;
		for (let i = 0; i < config.length; i++) {
			let { path, outlet, children, defaultRoute = false, defaultParams = {} } = config[i];
			path = this._stripLeadingSlash(path);
			const segments: (symbol | string)[] = path.split('/');
			const route: Route = {
				params: [],
				outlet,
				path,
				segments,
				defaultParams,
				query: [],
				children: [],
				fullPath: parentRoute ? `${parentRoute.fullPath}/${path}` : path,
				fullParams: []
			};
			if (defaultRoute) {
				this._defaultOutlet = outlet;
			}
			for (let i = 0; i < segments.length; i++) {
				const segment = segments[i];
				if (typeof segment  === 'string' && segment[0] === '{') {
					route.params.push(segment.replace('{', '').replace('}', ''));
					segments[i] = PARAM;
				}
			}

			route.fullParams = parentRoute ? [
				...parentRoute.fullParams,
				...route.params
			] : route.params;

			if (children && children.length > 0) {
				this._register(children, route.children, route);
			}
			this._outletMap[outlet] = route;
			routes.push(route);
		}
	}

	private _getQueryParams(queryParamString?: string): { [index: string]: string } {
		const queryParams: { [index: string]: string } = {};
		if (queryParamString) {
			const queryParameters = queryParamString.split('&');
			for (let i = 0; i < queryParameters.length; i++) {
				const [ key, value ] = queryParameters[i].split('=');
				queryParams[key] = value;
			}
		}
		return queryParams;
	}

	private _onChange(originalPath: string): void {
		this.emit({ type: 'navstart' });
		this._matchedOutlets = Object.create(null);
		this._currentParams  = {};
		originalPath = this._stripLeadingSlash(originalPath);

		const [ path, queryParamString ] = originalPath.split('?');
		const queryParams = this._getQueryParams(queryParamString);
		let params: Params = {};
		let routes = [ ...this._routes ];
		let paramIndex = 0;
		let segments = path.split('/');
		let routeMatched = false;
		let previousOutlet: string | undefined = undefined;
		while (routes.length > 0) {
			if (segments.length === 0) {
				break;
			}
			const route = routes.shift();
			let type: MatchType = 'exact';
			if (route !== undefined) {
				const segmentsForRoute = [ ...segments ];
				let routeMatch = true;
				let segmentIndex = 0;

				if (segments.length < route.segments.length) {
					routeMatch = false;
					continue;
				}
				while (segments.length > 0) {
					if (route.segments[segmentIndex] === undefined) {
						if (segments.length > 0) {
							type = 'partial';
						}
						break;
					}
					const segment = segments.shift();
					if (segment !== undefined) {
						if (route.segments[segmentIndex] === PARAM) {
							params[route.params[paramIndex++]] = segment;
						}
						else if (route.segments[segmentIndex] !== segment) {
							routeMatch = false;
							break;
						}
					}
					segmentIndex++;
				}
				if (routeMatch === true) {
					previousOutlet = route.outlet;
					routeMatched = true;
					this._matchedOutlets[route.outlet] = { queryParams, params, type };
					if (route.children.length) {
						paramIndex = 0;
						this._currentParams = { ...this._currentParams, ...params };
						params = {};
					}
					routes = [ ...route.children ];
				}
				else {
					if (previousOutlet !== undefined) {
						this._matchedOutlets[previousOutlet].type = 'error';
					}
					segments = [ ...segmentsForRoute ];
				}
			}
		}
		if (routeMatched === false) {
			this._matchedOutlets.errorOutlet = { queryParams, params, type: 'error' };
		}
	}
}
