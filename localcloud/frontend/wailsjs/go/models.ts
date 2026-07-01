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
	
	export class ScanResult {
	    name: string;
	    version: string;
	    scripts: Record<string, string>;
	    dependencies: Record<string, string>;
	    devCommand: string;
	    defaultPort: number;
	    framework: string;
	    hasNode: boolean;
	    nodeVersion: string;
	    hasBun: boolean;
	    bunVersion: string;
	    projectPath: string;
	
	    static createFrom(source: any = {}) {
	        return new ScanResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.scripts = source["scripts"];
	        this.dependencies = source["dependencies"];
	        this.devCommand = source["devCommand"];
	        this.defaultPort = source["defaultPort"];
	        this.framework = source["framework"];
	        this.hasNode = source["hasNode"];
	        this.nodeVersion = source["nodeVersion"];
	        this.hasBun = source["hasBun"];
	        this.bunVersion = source["bunVersion"];
	        this.projectPath = source["projectPath"];
	    }
	}
	export class SystemInfo {
	    totalRamMB: number;
	    cpuCores: number;
	    os: string;
	    arch: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalRamMB = source["totalRamMB"];
	        this.cpuCores = source["cpuCores"];
	        this.os = source["os"];
	        this.arch = source["arch"];
	    }
	}

}

