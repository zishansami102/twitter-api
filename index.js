const { Requester, Validator } = require('@chainlink/external-adapter')


// Define custom error scenarios for the API.
// Return true for the adapter to retry.
const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

// Define custom parameters to be used by the adapter.
// Extra parameters can be stated in the extra object,
// with a Boolean value indicating whether or not they
// should be required.
const customParams = {
  tweetId: ['id', 'tweetId', 'tweet'],
  metric: ['metric'],
  text: false,
  endpoint: false
}

const metricTypes = {
  0: 'like_count',
  1: 'retweet_count',
  2: 'reply_count',
  3: 'quote_count'
}

const createRequest = (input, callback) => {
  // The Validator helps you validate the Chainlink request data
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id
  // const endpoint = validator.validated.data.endpoint || 'tweets'
  const ids = validator.validated.data.tweetId.toUpperCase()
  const url = 'https://api.twitter.com/2/tweets?ids='+ids+'&tweet.fields=public_metrics'
  const metric = validator.validated.data.metric
  // const tweet_fields='public_metrics'
  const text = validator.validated.data.text
  const bToken = process.env.BEARER_TOKEN;
  console.log(url);


  // const params = {
  //   ids,
  //   'tweet.fields':tweet_fields
  // }
  const headers = {
    Authorization: 'Bearer '+bToken,
  };

  // This is where you would add method and headers
  // you can add method like GET or POST and add it to the config
  // The default is GET requests
  // method = 'get'
  // headers = 'headers.....'
  const config = {
    url,
    headers
  }

  console.log(config);

  // The Requester allows API calls be retry in case of timeout
  // or connection failure
  Requester.request(config, customError)
    .then(response => {
      // It's common practice to store the desired value at the top-level
      // result key. This allows different adapters to be compatible with
      // one another.

      if(!text) {
        response.data.result = Requester.getResult(response.data, ['data',0,'public_metrics',metricTypes[metric]])
      } else {
        response.data.result = Requester.getResult(response.data, ['data',0,'text'])
      }

      callback(response.status, Requester.success(jobRunID, response))
    })
    .catch(error => {
      callback(500, Requester.errored(jobRunID, error))
    })
}

// // This is a wrapper to allow the function to work with
// // GCP Functions
// exports.gcpservice = (req, res) => {
//   createRequest(req.body, (statusCode, data) => {
//     res.status(statusCode).send(data)
//   })
// }

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
