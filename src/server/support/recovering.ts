import { TIMELINE_SERVER_SHUTDOWN, TIMELINE_CLOCK_MINUTE, TIMELINE_GAME_START, TIMELINE_RECOVERY_COMPLETE } from '../../events';
import { System } from '../system';
import { writeFile, writeFileSync, readFileSync } from 'fs';
import { MobId, PlayerId, PlayerName, PlayerNameHistoryItem, PlayerRecoverItem } from '../../types';

const WRITE_ASYNC:boolean = true

export default class Recovering extends System {
  constructor({ app }) {
    super({ app });

    this.listeners = {
      [TIMELINE_CLOCK_MINUTE]: this.periodic,
      [TIMELINE_GAME_START]: this.restore,
    };
  }

  periodic(): void {
    this.clearExpired();
  }

  clearExpired(): void {
    const now = Date.now();
    const ids = [...this.storage.playerRecoverList.keys()];

    for (let index = 0; index < ids.length; index += 1) {
      const recover = this.storage.playerRecoverList.get(ids[index]);

      if (recover.expired < now) {
        this.storage.playerRecoverList.delete(ids[index]);
      }
    }
  }

  // restore reads the game cache from disk and loads its members into game storage. 
  restore(): void {

    try {
      var f = readFileSync(this.getCachePath(), 'utf-8');
    } catch (err) {
      this.log.warn('unable to open recovery file. %s', err)
      return
    }
    let data = JSON.parse(f)
    if (data == undefined) {
      this.log.debug('no recovery data found')
      return
    }

    // playerRecoverList: Map<PlayerId, PlayerRecoverItem> = new Map();
    if (data['players']) {
      for (let key in data['players']) {
        this.storage.playerRecoverList.set(parseInt(key), data['players'][key])
      }
      this.log.debug('recovered players list. %s players', [...this.storage.playerRecoverList.values()].length)
    }

    // playerHistoryNameToIdList: Map<PlayerName, PlayerNameHistoryItem> = new Map();
    if (data['playerHistoryNameToIdList']) {
      for (let key in data['playerHistoryNameToIdList']) {
        this.storage.playerHistoryNameToIdList.set(key, data['playerHistoryNameToIdList'][key])
      }
      this.log.debug('recovered playerHistoryNameToIdList. %s entries', [...this.storage.playerHistoryNameToIdList.values()].length)
    }

    // public mobIdList: Set<MobId> = new Set();
    if (data['mobIdList']) {
      for (let n in data['mobIdList']) {
        this.storage.mobIdList.add(data['mobIdList'][n])
      }
      this.log.debug('recovered mobIdList. %s entries', [...this.storage.mobIdList.values()].length)
    }

    if (data['nextMobId'] && data['nextMobId'] > -1) {
      this.storage.nextMobId = data['nextMobId']
      this.log.debug('recovered nextMobId. %s', this.storage.nextMobId)
    }

  }

  getCachePath(): string {
    return this.config.cache.path + '/recovery.json'
  }

}
