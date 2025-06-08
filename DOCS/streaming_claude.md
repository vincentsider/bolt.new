# Streaming Text Completions

<Warning>
  **Legacy API**

  The Text Completions API is a legacy API. Future models and features will require use of the [Messages API](/en/api/messages), and we recommend [migrating](/en/api/migrating-from-text-completions-to-messages) as soon as possible.
</Warning>

When creating a Text Completion, you can set `"stream": true` to incrementally stream the response using [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent%5Fevents/Using%5Fserver-sent%5Fevents) (SSE). If you are using our [client libraries](/en/api/client-sdks), parsing these events will be handled for you automatically. However, if you are building a direct API integration, you will need to handle these events yourself.

## Example

```bash Shell
curl https://api.anthropic.com/v1/complete \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --data '
{
  "model": "claude-2",
  "prompt": "\n\nHuman: Hello, world!\n\nAssistant:",
  "max_tokens_to_sample": 256,
  "stream": true
}
'
```

```json Response
event: completion
data: {"type": "completion", "completion": " Hello", "stop_reason": null, "model": "claude-2.0"}

event: completion
data: {"type": "completion", "completion": "!", "stop_reason": null, "model": "claude-2.0"}

event: ping
data: {"type": "ping"}

event: completion
data: {"type": "completion", "completion": " My", "stop_reason": null, "model": "claude-2.0"}

event: completion
data: {"type": "completion", "completion": " name", "stop_reason": null, "model": "claude-2.0"}

event: completion
data: {"type": "completion", "completion": " is", "stop_reason": null, "model": "claude-2.0"}

event: completion
data: {"type": "completion", "completion": " Claude", "stop_reason": null, "model": "claude-2.0"}

event: completion
data: {"type": "completion", "completion": ".", "stop_reason": null, "model": "claude-2.0"}

event: completion
data: {"type": "completion", "completion": "", "stop_reason": "stop_sequence", "model": "claude-2.0"}

```

## Events

Each event includes a named event type and associated JSON data.

Event types: `completion`, `ping`, `error`.

### Error event types

We may occasionally send [errors](/en/api/errors) in the event stream. For example, during periods of high usage, you may receive an `overloaded_error`, which would normally correspond to an HTTP 529 in a non-streaming context:

```json Example error
event: completion
data: {"completion": " Hello", "stop_reason": null, "model": "claude-2.0"}

event: error
data: {"error": {"type": "overloaded_error", "message": "Overloaded"}}
```

## Older API versions

If you are using an [API version](/en/api/versioning) prior to `2023-06-01`, the response shape will be different. See [versioning](/en/api/versioning) for details.


Long requests
We highly encourage using the streaming Messages API or Message Batches API for long running requests, especially those over 10 minutes.

We do not recommend setting a large max_tokens values without using our streaming Messages API or Message Batches API:

Some networks may drop idle connections after a variable period of time, which can cause the request to fail or timeout without receiving a response from Anthropic.
Networks differ in reliablity; our Message Batches API can help you manage the risk of network issues by allowing you to poll for results rather than requiring an uninterrupted network connection.
If you are building a direct API integration, you should be aware that setting a TCP socket keep-alive can reduce the impact of idle connection timeouts on some networks.

Our SDKs will validate that your non-streaming Messages API requests are not expected to exceed a 10 minute timeout and also will set a socket option for TCP keep-alive.
