export namespace engine {
	
	export class WindowBounds {
	    x: number;
	    y: number;
	    width: number;
	    height: number;
	
	    static createFrom(source: any = {}) {
	        return new WindowBounds(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	        this.height = source["height"];
	    }
	}
	export class RunConfigSave {
	    scriptName: string;
	    port: number;
	    memoryMB: number;
	    cpuCores: number;
	    vercelSync: boolean;
	    vercelEnvKey: string;
	    tunnelMode: string;
	
	    static createFrom(source: any = {}) {
	        return new RunConfigSave(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.scriptName = source["scriptName"];
	        this.port = source["port"];
	        this.memoryMB = source["memoryMB"];
	        this.cpuCores = source["cpuCores"];
	        this.vercelSync = source["vercelSync"];
	        this.vercelEnvKey = source["vercelEnvKey"];
	        this.tunnelMode = source["tunnelMode"];
	    }
	}
	export class AppConfig {
	    lastProjectPath: string;
	    lastRunConfig?: RunConfigSave;
	    windowBounds?: WindowBounds;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.lastProjectPath = source["lastProjectPath"];
	        this.lastRunConfig = this.convertValues(source["lastRunConfig"], RunConfigSave);
	        this.windowBounds = this.convertValues(source["windowBounds"], WindowBounds);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

