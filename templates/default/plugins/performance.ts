import { ChainPlugin, ProgramsMapType, PluginCallProps} from "../chain";

type W2 = WebGL2RenderingContext


export class PerformancePlugin implements ChainPlugin {
  private gl: W2
  private ext
  private query: {[key: string]: WebGLQuery }
  private programsCount
  
  aggregateKey: string = 'agg'
  private aggStats: {[key: number]: number[]} 
  
  stats: {[key: string]: {
    last_60?: number [],
    avg: number,
    max?: number
  }}

  constructor(gl: W2) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!this.ext) {
      console.warn('EXT_disjoint_timer_query_webgl2 extension is not supported.');
    }
    this.gl = gl;
    this.query = {}
    this.stats = {}
    this.aggStats = {}
    this.programsCount = 0
  }

  onInit(programs: ProgramsMapType) {
    if (!this.ext) return
    this.programsCount = Object.keys(programs).length
    this.stats[this.aggregateKey] = {avg:0}
  }

  beforeDrawCall({passId, time}:PluginCallProps) {
    if (!this.ext) return
    const key = `${passId}-${time}`
    const query = this.gl.createQuery()!;
    this.query[key] = query;

    if(query) {
      // Start the timer query
      this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    }
    
    !this.stats[passId] && this.initStatsKey(passId)
    this.aggStats[time] = []

  }

  afterDrawCall(props: PluginCallProps) {
    if (!this.ext) return

    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.checkQueryResult(props)
  }

  private tryToFlushAggStats(time: number, avg: number){

    // if came too late -> exit
    if(!this.aggStats[time]) return
    
    this.aggStats[time].push(avg);

    // if not from all programms -> exit
    if(this.aggStats[time].length !== this.programsCount) return
      
    //console.log('this.aggStats', this.aggStats)
    
    this.stats[this.aggregateKey].avg = Object.values(this.aggStats[time]).reduce((acc:number, v:number) => acc + v, 0)

    const pendingsStats = Object.keys(this.aggStats).filter(t => {
      return parseFloat(t) > time
    }).reduce((agg, t) => ({...agg, [t]: this.aggStats[parseFloat(t)]}), {})
    
    this.aggStats = pendingsStats
    
  }

  private initStatsKey(passId: string) {
    this.stats[passId] = {
      last_60: [],
      avg: 0
    }
  }
  // Get the query result
checkQueryResult(props: PluginCallProps) {
  const {passId, time} = props
  const key = `${passId}-${time}`

  const query = this.query[key]
  
  // if query is failed, leave
  if (!query) return


  const gl = this.gl
  const ext = this.ext
  
  // Check if the query result is available
  const available = gl.getQueryParameter(query!, gl.QUERY_RESULT_AVAILABLE);
  const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);

  
  if (query && available && !disjoint) {
    // Get the elapsed time in nanoseconds
    const timeElapsed = gl.getQueryParameter(query!, gl.QUERY_RESULT);
    const ms = timeElapsed / 1e6;
    const last_60 =  this.stats[passId].last_60?.slice(-59) || [0];
    last_60.push(ms)
    
    const {sum, max} = last_60.reduce((a, b) => ({
      sum: a.sum + b, 
      max: b > a.max ? b : a.max
    }), {sum:0, max:0});
    const avg = (sum / last_60.length) || 0;
    this.stats[passId] = {
      last_60,
      max,
      avg,
    }
    
    
    this.tryToFlushAggStats(time, avg)
    
    delete this.query[key]
  } else {
    // The query result is not available or the GPU is disjointed
    // Check again in the next frame
      requestAnimationFrame(() => this.checkQueryResult(props));

    
  }
}

}
