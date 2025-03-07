import { EndpointUpdatedEventData } from './EndpointUpdatedEvent';
import EndpointId from './EndpointId';
import UserId from '../Shared/UserId';
import { strict as assert } from 'assert';
import EndpointUrl from './EndpointUrl';
import EndpointName from './EndpointName';

const HEALCHECK_INTERVAL_MINUTES = 1;
const TOTAL_LATEST_CHECKS = 90;

const AVAILABILITY_DECIMALS = 4;

type Incident = {
  incidentDate: Date,
  duration: number,
  reason: string
}

type Status = {
  date: Date
  incidents: Incident[]
  averageResponseTime: number
  totalSuccessfulHealthChecks: number
};

export default class Endpoint {
  private id: EndpointId;
  private userId: UserId;
  private url: EndpointUrl;
  private name: EndpointName;
  
  private updated: Date;
  private dailyStatuses: Status[];
  private firstHealthCheckDate: Date;
  private downtimeMinutes: number;
  private serviceDownDate: Date;

  constructor(id: EndpointId, userId: UserId, url: EndpointUrl, name: EndpointName, updated: Date, dailyStatuses, firstHealthCheckDate, downtimeMinutes, serviceDownDate) {
    this.id = id;
    this.userId = userId;
    this.url = url;
    this.name = name;
    this.updated = updated;
    this.dailyStatuses = dailyStatuses;
    this.firstHealthCheckDate = firstHealthCheckDate;
    this.downtimeMinutes = downtimeMinutes;
    this.serviceDownDate = serviceDownDate || null;
  }

  static create(userId: UserId, url: EndpointUrl, name: EndpointName) {
    assert(userId, 'The userId is mandatory');
    assert(url, 'The url is mandatory');
    assert(name, 'The name is mandatory');

    return new Endpoint(EndpointId.generate(), userId, url, name, new Date(), [], null, 0, null);
  }

  getId() { return this.id; }
  getUserId() { return this.userId; }
  getUrl() { return this.url; }
  getName() { return this.name; }
  getUpdated() { return this.updated; }
  getDailyStatuses() { return this.dailyStatuses; }
  getFirstHealthCheckDate() { return this.firstHealthCheckDate }
  getServiceDownDate() { return this.serviceDownDate; }
  getDowntimeMinutes() { return this.downtimeMinutes }

  updateWithHealthCheck(eventData: EndpointUpdatedEventData) {
    this.updateLastHealthChecks(eventData);
    this.updateFirstHealthCheckDate();
    this.updateServiceDown(eventData);
    this.updated = new Date();
  }

  private updateServiceDown(eventData: EndpointUpdatedEventData) {
    this.increaseDowntimeMinutes();

    if (eventData.isFailed()) {
      if (this.serviceDownDate === null) {
        this.serviceDownDate = eventData.date;
      }
    }
    else this.serviceDownDate = null;
  }

  private increaseDowntimeMinutes() {
    if (this.serviceDownDate) {
      this.downtimeMinutes += HEALCHECK_INTERVAL_MINUTES;
    }
  }

  private updateLastHealthChecks(eventData: EndpointUpdatedEventData) {

    const isNewIncident = (status) => {
      return this.getServiceDownDate() === null || status.incidents.length === 0;
    }

    const addIncident = (status: Status) => {
      status.incidents.push({
        incidentDate: eventData.date,
        duration: 0,
        reason: ''
      });
    }

    const updateLastIncident = (status: Status) => {
      const lastIncident = status.incidents[0];
      const diffInMs = eventData.date.getTime() - this.getServiceDownDate().getTime();
      lastIncident.duration = diffInMs / (60 * 1000);
    }

    const updateStatusIncident = (eventData: EndpointUpdatedEventData, status: Status) => {
      if (eventData.isFailed()) {
        if (isNewIncident(status)) {
          addIncident(status);
        }
        else {
          updateLastIncident(status)
        }
      }
    }

    const shoudAggregateStatus = () => {
      return this.dailyStatuses.length > 0 &&
        this.isSameDay(this.getLastStatus().date, eventData.date)
    }

    if (shoudAggregateStatus()) {
      const lastStatus = this.getLastStatus();
      if (!eventData.isFailed()) {
        lastStatus.averageResponseTime = ((lastStatus.averageResponseTime * lastStatus.totalSuccessfulHealthChecks) + eventData.time) / (lastStatus.totalSuccessfulHealthChecks + 1);
        lastStatus.totalSuccessfulHealthChecks += 1;
      }
      updateStatusIncident(eventData, lastStatus);
    }
    else {
      const lastStatus = this.createStatus(eventData);
      updateStatusIncident(eventData, lastStatus);
      this.dailyStatuses.unshift(lastStatus);
      this.dailyStatuses.splice(TOTAL_LATEST_CHECKS);
    }
  }


  private createStatus(eventData: EndpointUpdatedEventData): Status {
    return {
      date: eventData.date,
      averageResponseTime: eventData.isFailed()? 0 : eventData.time,
      incidents: [] as Incident[],
      totalSuccessfulHealthChecks: eventData.isFailed()? 0 : 1
    };
  }

  private getLastStatus(): Status {
    return this.dailyStatuses[0];
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return  date1.getUTCDate() === date2.getUTCDate() &&
            date1.getUTCMonth() === date2.getUTCMonth() &&
            date1.getUTCFullYear() === date2.getUTCFullYear();
  }

  private updateFirstHealthCheckDate() {
    if (!this.firstHealthCheckDate) {
      this.firstHealthCheckDate = new Date();
    }
  }

  getAvailability(): number {    
    if(!this.firstHealthCheckDate) return 0;
    
    const diffSeconds = (Date.now() - this.firstHealthCheckDate.getTime()) / 1000;
    const diffMinutes = diffSeconds / 60;
    const availabilityRatio = (diffMinutes - this.downtimeMinutes) / diffMinutes;
    const percent = availabilityRatio * 100;

    return parseFloat(percent.toFixed(AVAILABILITY_DECIMALS));
  }

}

export enum Statuses {
  UP, 
  DOWN
}


