const metricsController = require('../api/controllers/deployment-metrics');
const { info, error } = require('../logger');
const metricsTransformer = require('../services/data-transformers/metrics');
const moment = require('moment');

const timeBefore = 30;
const timeAfter = 30;
const maxSecondsRange = 3500;

const init = (io) => {
  const metrics = io.of('/metrics');
  metrics.on('connection', (socket) => {
    let intervalId;
    const emitOnce = async (socket, { metric, provider, deploymentTime }) => {
      info('sending metrics data...');
      try {
        const data = await metricsController.getMetric(metric, provider, deploymentTime, timeBefore, timeAfter);
        const transformedData = metricsTransformer(data);
        const last = data[0].Points[data[0].Points.length - 1][0];
        socket.emit('data', {
          data: transformedData, config: {
            query: metric,
            provider
          }
        });
        // stop calling the API if we got enough points
        if (moment.unix(deploymentTime).add(29.5 * 60, 's').isBefore(moment(last))) {
          info(`stop calling the API for metric: ${metric}, provider: ${provider}, last point: ${last}, deployment time: ${deploymentTime}`);
          clearInterval(intervalId);
        }
      }
      catch (e) {
        error(e);
        error(`error getting metrics for ${metric} ${provider} ${deploymentTime}`);
        socket.emit('metric-error', {
          error: {
            code: e.response.code,
            message: e.response.data,
            name: e.name,
            url: e.config.url
          }, config: {
            query: metric,
            provider
          }
        });
      }
    };
    info('User connected to metrics NS');
    socket.on('init', async (metric, provider, deploymentTime) => {
      info(`metrics init: ${metric} ${provider} ${deploymentTime}`);
      emitOnce(socket, { metric, provider, deploymentTime });
      intervalId = setInterval(async () => {
        emitOnce(socket, { metric, provider, deploymentTime });
      }, 10000)
    });
    socket.on('disconnect', () => {
      clearInterval(intervalId);
      info('disconnect from metric NS');
    })
    socket.on('close', () => {
      clearInterval(intervalId);
      info('close metric NS');
    })
  })
};
module.exports = init;
