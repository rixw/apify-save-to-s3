const Apify = require('apify');
const S3 = require('aws-sdk/clients/s3');
const axios = require('axios');

const {
  utils: { log },
} = Apify;

function getProperty(propertyName, object) {
  const parts = propertyName.split('.');
  const { length } = parts;
  let property = object || this;
  for (let i = 0; i < length; i += 1) {
    property = property[parts[i]];
  }

  return property;
}

function formatKey(input) {
  log.debug(`save-to-s3: parsing format string: ${input.keyFormat}`);
  let result =
    // eslint-disable-next-line no-template-curly-in-string
    input.keyFormat || '${resource.id}_${resource.startedAt}.${format}';
  const replaceMatches = result.match(/\$\{[^$]*\}/g);
  if (replaceMatches) {
    log.debug(`save-to-s3: found ${replaceMatches.length} replacement tags`);
    for (let i = 0; i < replaceMatches.length; i += 1) {
      log.debug(`save-to-s3: replacing tag ${replaceMatches[i]}`);
      const tag = replaceMatches[i];
      if (!tag || tag.length < 3) break; // Fail silently
      const inputProp = tag.substr(2, tag.length - 3);
      log.debug(`save-to-s3: getting property ${inputProp}`);
      const value = getProperty(inputProp, input);
      log.debug(`save-to-s3: got property value ${value}`);
      result = result.replace(tag, value);
    }
  }
  return result;
}

Apify.main(async () => {
  log.debug('save-to-s3: reading INPUT.');
  const input = await Apify.getInput();
  if (!input) throw new Error('INPUT cannot be empty!');
  if (input.debugLog) log.setLevel(log.LEVELS.DEBUG);

  // Build the APIFY API Url for the dataset
  const stem = `https://api.apify.com/v2/datasets/${
    input.resource.defaultDatasetId
  }/items`;
  const url = new URL(stem);
  const params = new URLSearchParams(input.datasetOptions);
  params.append('format', input.format);
  params.append('clean', input.clean);
  url.search = params.toString();
  log.debug(`save-to-s3: get dataset items URL: ${url.href}`);

  // Download the dataset
  let response;
  try {
    response = await axios.get(url.href, { transform: undefined });
    log.debug(
      `save-to-s3: get dataset items response: ${response.status} ${
        response.statusText
      }`,
    );
  } catch (e) {
    throw new Error(
      `Unable to download dataset from ${url.href}: ${e.message}`,
    );
  }

  // Handle non-200 responses
  if (response.status !== 200) {
    throw new Error(
      `save-to-s3: APIFY API ${url.href} response status ${response.status} ${
        response.statusText
      }`,
    );
  }

  // Make sure the object is a string - Axios automatically parses JSON
  let fileContents = response.data;
  if (typeof fileContents === 'object') {
    fileContents = JSON.stringify(fileContents);
  }
  if (!fileContents) fileContents = '';
  log.debug(`save-to-s3: ${fileContents.length}`);

  // Save to S3
  const key = formatKey(input);
  log.debug(`save-to-s3: object key ${key}`);
  const s3 = new S3({
    apiVersion: '2006-03-01',
    accessKeyId: input.accessKeyId,
    secretAccessKey: input.secretAccessKey,
    region: input.region,
  });
  const uploadParams = {
    Bucket: input.bucket,
    Key: key,
    Body: fileContents,
    ContentEncoding: response.ContentEncoding,
  };
  let upload;
  try {
    upload = await s3.putObject(uploadParams).promise();
    log.debug(`save-to-s3: AWS response: ${JSON.stringify(upload, null, 2)}`);
  } catch (e) {
    throw new Error(`Unable to upload to S3: ${e.message}`);
  }

  await Apify.setValue('OUTPUT', upload);
  log.debug('save-to-s3: done');
});
