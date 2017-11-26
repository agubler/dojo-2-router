export class Evented {

		private _onMap: { [index: string]: Function[] } = Object.create(null);

		public on(type: string, on: Function) {
			const onFunctions = this._onMap[type];
			if (onFunctions) {
				onFunctions.push(on);
			}
			else {
				this._onMap[type] = [ on ];
			}
		}

		public emit(obj: any) {
			const onFunctions = this._onMap[obj.type];
			if (onFunctions) {
				for (let i = 0; i < onFunctions.length; i++) {
					onFunctions[i](obj);
				}
			}

		}
	}

	export default Evented;
