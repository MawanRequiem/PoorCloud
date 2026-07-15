export namespace core {
	
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
	    defaultRunConfig?: RunConfigSave;
	    windowBounds?: WindowBounds;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.lastProjectPath = source["lastProjectPath"];
	        this.lastRunConfig = this.convertValues(source["lastRunConfig"], RunConfigSave);
	        this.defaultRunConfig = this.convertValues(source["defaultRunConfig"], RunConfigSave);
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

export namespace process {
	
	export class RunConfig {
	    projectPath: string;
	    runtime: string;
	    scriptName: string;
	    port: number;
	    memoryMB: number;
	    cpuCores: number;
	
	    static createFrom(source: any = {}) {
	        return new RunConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectPath = source["projectPath"];
	        this.runtime = source["runtime"];
	        this.scriptName = source["scriptName"];
	        this.port = source["port"];
	        this.memoryMB = source["memoryMB"];
	        this.cpuCores = source["cpuCores"];
	    }
	}

}

export namespace projects {
	
	export class ProjectState {
	    projectID: string;
	    name: string;
	    version: string;
	    framework: string;
	    port: number;
	    tunnelURL: string;
	    tunnelStatus: string;
	    status: string;
	    ramMB: number;
	    cpuPercent: number;
	    projectPath: string;
	    devCommand: string;
	    hasNode: boolean;
	    hasBun: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ProjectState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectID = source["projectID"];
	        this.name = source["name"];
	        this.version = source["version"];
	        this.framework = source["framework"];
	        this.port = source["port"];
	        this.tunnelURL = source["tunnelURL"];
	        this.tunnelStatus = source["tunnelStatus"];
	        this.status = source["status"];
	        this.ramMB = source["ramMB"];
	        this.cpuPercent = source["cpuPercent"];
	        this.projectPath = source["projectPath"];
	        this.devCommand = source["devCommand"];
	        this.hasNode = source["hasNode"];
	        this.hasBun = source["hasBun"];
	    }
	}

}

export namespace scanner {
	
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

}

