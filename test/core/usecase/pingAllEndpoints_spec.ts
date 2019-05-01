import PingAllEndpointsUnitTest from './PingAllEdnpointsUnitTest';

describe('Scenario: Ping all endpoints usecase', () => {

  context('When all endpoints return ok', async () => {

    it('should save the status', async () => {
      const testCase = new PingAllEndpointsUnitTest();
      testCase.givenMultipleSuccessfullEndpoints();
      const pingAllEndpoints = testCase.buildPingAllEndpointsUseCase();

      await pingAllEndpoints.execute();

      testCase.repositoryShouldSave();
    });

    it('should emit the endpoint_updated event', async () => {
      const testCase = new PingAllEndpointsUnitTest();
      testCase.givenMultipleSuccessfullEndpoints();
      const pingAllEndpoints = testCase.buildPingAllEndpointsUseCase();

      await pingAllEndpoints.execute();
      
      testCase.eventPublisherShouldEmitEvent();
    });


  });

  context('When an endpoint fails', async () => {
  
    it('should save the failed status', async () => {
      const testCase = new PingAllEndpointsUnitTest();
      testCase.givenSomeFailedEndpoint();
      const pingAllEndpoints = testCase.buildPingAllEndpointsUseCase();

      await pingAllEndpoints.execute();

      testCase.repositoryShouldSave();
    });

    it('should emit an event', async () => {
      const testCase = new PingAllEndpointsUnitTest();
      testCase.givenSomeFailedEndpoint();
      const pingAllEndpoints = testCase.buildPingAllEndpointsUseCase();

      await pingAllEndpoints.execute();

      testCase.eventPublisherShouldEmitEvent();
    });

  });

})
