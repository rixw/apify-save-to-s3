# save-to-s3

An [Apify](https://apify.com) actor to save the default dataset of a run to an S3 bucket.

It is designed to be called from the ACTOR.RUN.SUCCEEDED webhook of the actor that has generated the dataset.

This actor is compatible with API v2 - I made it because I couldn't get the [Crawler Results To S3](https://apify.com/apify/crawler-results-to-s3) actor to work with v2 actors.

## Usage

AWS credentials and options for fomatting the data set are set on this actor's input, which are merged with the webhook's post data. You'll therefore need to create a task for your uploads so you can save common config such as your AWS credentials and dataset format details.

### 1. Create the task

Create a new task using the save-to-3 actor. This allows you to specify input to use every time the task is run. The webhook's post data will be merged with this at runtime - the values are those from the [get actor run API endpoint](https://apify.com/docs/api/v2#/reference/actors/run-object/get-run), all grouped under a `resource` property.

The properties you can specify in your Input for the task:

| Property          | Description                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `accessKeyId`     | The access key for the AWS user to connect with                                                                                                                                                                                                                                                                                                                                                  |
| `secretAccessKey` | The secret access key for the AWS user to connect with                                                                                                                                                                                                                                                                                                                                           |
| `region`          | The AWS region your bucket is located in (eg `eu-west-2`)                                                                                                                                                                                                                                                                                                                                        |
| `bucket`          | The bucket name to save files to                                                                                                                                                                                                                                                                                                                                                                 |
| `keyFormat`       | A string to specify the key (i.e. filename) for the S3 object you will save. You can specify any property from the `input` object using dot notation in a syntax similar to JavaScript template literals. For example, the defauult value `${resource.id}_${resource.startedAt}.${format}` will yield an S3 object with a name something like `SBNgQGmp87LtspHF1_2019-05-15T07:25:00.414Z.json`. |
| `format`          | Maps to the `format` parameter of the [get dataset items API endpoint](https://apify.com/docs/api/v2#/reference/datasets/item-collection) and accepts any of the valid string values                                                                                                                                                                                                             |
| `clean`           | Maps to the `clean` parameter of the [get dataset items API endpoint](https://apify.com/docs/api/v2#/reference/datasets/item-collection)                                                                                                                                                                                                                                                         |
| `datasetOptions`  | An object that allows you to specify any of the other parameters of the [get dataset items API endpoint](https://apify.com/docs/api/v2#/reference/datasets/item-collection), for example `{ "offset": "10" }` is the equivalent of settings `?offset=10` in the API call                                                                                                                         |
| `debugLog`        | A `boolean` indicating whether to use debug level logging                                                                                                                                                                                                                                                                                                                                        |

### 2. Create the webhook

Go to your save-to-s3 task's API tab and copy the URL for the Run Task endpoint, which will be in the format: `https://api.apify.com/v2/actor-tasks/TASK_NAME_HERE/runs?token=YOUR_TOKEN_HERE`

Go to either the actor or (more likely) the actor task you want to add save-to-s3 functionality to. In the Webhooks tab, add a webhook with the URL you just copied. For Event types, select ACTOR.RUN.SUCCEEDED. Then Save.

### 3. Er, that's it!
