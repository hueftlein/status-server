import { EndpointUpdatedEventData } from "../Endpoint/EndpointUpdatedEvent";


export default interface EndpointUpdatedEventRepository {
  save(event: EndpointUpdatedEventData): Promise<void>;
  findAll(endpointStatusId: string): Promise<EndpointUpdatedEventData[]>;
}
