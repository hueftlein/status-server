/* eslint-disable no-console */

import PingService from '../domain/HealthCheck/PingService';
import PingResult from '../domain/HealthCheck/PingResult';
import * as ping from 'ping';
import Endpoint from '../domain/Endpoint/Endpoint';

export default class PingServiceImpl implements PingService {

  async ping(endpointStatus: Endpoint): Promise<PingResult> {
    const config = {};
    const host = endpointStatus.getUrl().getValue();
    const result = await ping.promise.probe(host, config);
  
    const pingResult = new PingResult(host, result.numeric_host, this.getTime(result), new Date());

    return pingResult;
  }

  private getTime(result) {
    if (result.time === 'unknown') {
      return null;
    }

    return result.time;
  }
}
