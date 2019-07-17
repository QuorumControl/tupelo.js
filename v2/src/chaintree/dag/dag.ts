import CID from 'cids';

const tupeloMessages: any = require('tupelo-messages');
const ipldDagCbor: any = require('ipld-dag-cbor');
const Block: any = require('ipfs-block');
const Ipld: any = require('ipld');

export interface IBlock {
  data: Buffer
  cid: CID
}

// copy/pasta from https://ipfs.github.io/js-ipfs-block-service
// setExchange
// unsetExchange
// hasExchange
// put
// putMany
// get
// getMany
// delete
export interface IBlockService {
  put(block:IBlock):Promise<any>
  get(cid:CID):Promise<IBlock>
  delete(cid:CID):Promise<any>
}

interface IDagStoreResolveResponse {
  remainderPath: string
  value: any
}

interface IExtendedDagStoreIterator {
  first():Promise<IDagStoreResolveResponse>
  last():Promise<IDagStoreResolveResponse>
  all():Promise<IDagStoreResolveResponse[]>
}

export interface IDagStore {
  get(cid: CID): Promise<Object>
  resolve(cid: CID, path: string): IExtendedDagStoreIterator
}

export interface IResolveResponse {
  remainderPath: string[]
  value: Object | null
}

export class Dag {
  tip: CID
  store: IDagStore

  constructor(tip: CID, store: IBlockService) {
    this.tip = tip;
    this.store = new Ipld({blockService: store});
  }

  async get(cid: CID) {
    return this.store.get(cid)
  }

  async resolve(path: Array<string>):Promise<IResolveResponse> {
    return this.resolveAt(this.tip, path)
  }

  async resolveAt(tip: CID, path: Array<string>):Promise<IResolveResponse> {
    const str_path  = path.join("/")
    const resolved = this.store.resolve(tip, str_path)
    let lastVal
    try {
      lastVal = await resolved.last()
    } catch (err) {
      const e:Error = err;
    
      if (!e.message.startsWith("Object has no property")) {
        throw err
      }
    }

    // nothing was resolvable, return full path as the remainder
    if (typeof lastVal === 'undefined') {
      return {remainderPath: path, value: null}
    }
  
    // if remainderPath is not empty, then the value was not found and an
    // error was thrown on the second iteration above - use the remainderPath
    // from the first iteration, but return nil for the error
    if (lastVal.remainderPath != "") {
      return { remainderPath: lastVal.remainderPath.split("/"), value: null }
    }

    return { remainderPath: [], value: lastVal.value }
  }
}