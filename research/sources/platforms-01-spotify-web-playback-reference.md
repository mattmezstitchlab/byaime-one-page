Source: https://developer.spotify.com/documentation/web-playback-sdk/reference
Title: Web Playback SDK Reference | Spotify for Developers
Fetched: 2026-09-08T00:36:23.920Z

[Skip to content](https://developer.spotify.com/documentation/web-playback-sdk/reference#main)

Web Playback SDK

- [Overview](https://developer.spotify.com/documentation/web-playback-sdk)
- [Getting started](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started)
- ConceptsConcepts
Concepts  - [Spotify Connect](https://developer.spotify.com/documentation/web-playback-sdk/concepts/spotify-connect)
- How-TosHow-Tos
How-Tos  - [Building a Spotify Player inside a Web app](https://developer.spotify.com/documentation/web-playback-sdk/howtos/web-app-player)
Reference- Spotify.Player [Spotify.Player](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayer)
Spotify.Player  - [connect](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerconnect)
  - [disconnect](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerdisconnect)
  - [addListener](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayeraddlistener)
  - [removeListener](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerremovelistener)
  - [getCurrentState](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayergetcurrentstate)
  - [setName](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayersetname)
  - [getVolume](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayergetvolume)
  - [setVolume](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayersetvolume)
  - [pause](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerpause)
  - [resume](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerresume)
  - [togglePlay](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayertoggleplay)
  - [seek](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerseek)
  - [previousTrack](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerprevioustrack)
  - [nextTrack](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayernexttrack)
  - [activateElement](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayeractivateelement)
- Events [Events](https://developer.spotify.com/documentation/web-playback-sdk/reference#events)
Events  - [ready](https://developer.spotify.com/documentation/web-playback-sdk/reference#ready)
  - [not\_ready](https://developer.spotify.com/documentation/web-playback-sdk/reference#not_ready)
  - [player\_state\_changed](https://developer.spotify.com/documentation/web-playback-sdk/reference#player_state_changed)
  - [autoplay\_failed](https://developer.spotify.com/documentation/web-playback-sdk/reference#autoplay_failed)
- Errors [Errors](https://developer.spotify.com/documentation/web-playback-sdk/reference#errors)
Errors  - [initialization\_error](https://developer.spotify.com/documentation/web-playback-sdk/reference#initialization_error)
  - [authentication\_error](https://developer.spotify.com/documentation/web-playback-sdk/reference#authentication_error)
  - [account\_error](https://developer.spotify.com/documentation/web-playback-sdk/reference#account_error)
  - [playback\_error](https://developer.spotify.com/documentation/web-playback-sdk/reference#playback_error)
- Objects [Objects](https://developer.spotify.com/documentation/web-playback-sdk/reference#objects)
Objects  - [WebPlaybackPlayer](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackplayer-object)
  - [WebPlaybackState](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackstate-object)
  - [WebPlaybackTrack](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybacktrack-object)
  - [WebPlaybackError](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackerror-object)

# Web Playback SDK Reference

Important policy notes

- Streaming applications may not be commercial


The Spotify Platform can not be used to develop commercial streaming integrations.

[More information](https://developer.spotify.com/policy/#iv-streaming-and-commercial-use:~:text=Commercial%20use%20restrictions,Streaming%20SDA%20itself.)

- Keep audio content in its original form


The Spotify Platform can not be used to develop applications that alter Spotify Content.

[More information](https://developer.spotify.com/policy/#iii-some-prohibited-applications:~:text=Do%20not%20permit%20any%20device%20or%20system%20to%20segue,.)

- Do not synchronize Spotify content


You may not synchronize any sound recordings with any visual media, including any advertising, film, television program, slideshow, video, or similar content

[More information](https://developer.spotify.com/policy/#iii-some-prohibited-applications:~:text=Do%20not%20synchronize%20any%20sound%20recordings%20with%20any%20visual%20media,.)

- Spotify content may not be broadcasted


The Spotify Platform can not be used for non-interactive broadcasting.

[More information](https://developer.spotify.com/policy/#iii-some-prohibited-applications:~:text=Do%20not%20create%20any%20product%20or%20service%20which%20includes%20any%20non,several%20simultaneous%20listeners.)


## Spotify.Player

### `Spotify.Player`

|  |  |
| --- | --- |
| **Description** | The main constructor for initializing the Web Playback SDK. It should contain an object with the player name, volume and access token. |
| **Response** | `void` |

**Code Example:**

` window.onSpotifyWebPlaybackSDKReady = () => {

const token = '[My Spotify Web API access token]';

const player = new Spotify.Player({

     name: 'Web Playback SDK Quick Start Player',

     getOAuthToken: cb => { cb(token); }

});

}

`

| Parameter Name | Type | Description | Required |
| --- | --- | --- | --- |
| `name` | String | The name of the Spotify Connect player. It will be visible in other Spotify apps | **Required** |
| `getOAuthToken` | Function | This will be called every time you run Spotify.Player#connect or when a user's access token has expired (maximum of 60 minutes). You will be provided with a `callback` parameter. You will need to execute this with a valid `access_token` string for a Spotify Premium user. | **Required** |
| `volume` | Float | The default volume of the player. Represented as a decimal between **0** and **1**. Default value is **1**. | _Optional_ |
| `enableMediaSession` | Boolean | If set to true, the [Media Session API](https://www.w3.org/TR/mediasession/) will be set with metadata and action handlers. Default value is **false**. | _Optional_ |

### `Spotify.Player\#connect`

|  |  |
| --- | --- |
| **Description** | Connect our Web Playback SDK instance to Spotify with the credentials provided during initialization. |
| **Response** | Returns a `Promise` containing a `Boolean` (either `true` or `false`) with the success of the connection. |

**Code Example:**

`player.connect().then(success => {

if (success) {

    console.log('The Web Playback SDK successfully connected to Spotify!');

}

})

`

### `Spotify.Player\#disconnect`

|  |  |
| --- | --- |
| **Description** | Closes the current session our Web Playback SDK has with Spotify. |
| **Response** | `Void` |

**Code Example:**

`player.disconnect()

`

### `Spotify.Player\#addListener`

|  |  |
| --- | --- |
| **Description** | Create a new event listener in the Web Playback SDK. Alias for Spotify.Player#on. |
| **Response** | Returns a `Boolean`. Returns `true` if the event listener for the `event_name` is unique. See [#removeListener](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayerremovelistener) for removing existing listeners. |

**Code Example:**

`player.addListener('ready', ({ device_id }) => {

console.log('The Web Playback SDK is ready to play music!');

console.log('Device ID', device_id);

})

`

| Parameter Name | Type | Description | Required |
| --- | --- | --- | --- |
| `event_name` | String | A valid event name. See Web Playback SDK Events. | **Required** |
| `callback` | Function | A callback function to be fired when the event has been executed. | **Required** |

### `Spotify.Player\#removeListener`

|  |  |
| --- | --- |
| **Description** | Remove an event listener in the Web Playback SDK. |
| **Response** | Returns a `Boolean`. Returns `true` if the event name is valid with registered callbacks from [#addListener](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayeraddlistener). |

**Code Example:**

`// Removes all "ready" events

player.removeListener('ready');

// Remove a specific "ready" listener

player.removeListener('ready', yourCallback)

`

| Parameter Name | Type | Description | Required |
| --- | --- | --- | --- |
| `event_name` | String | A valid event name. See Web Playback SDK Events. | **Required** |
| `callback` | Function | The callback function you would like to remove from the listener. If not provided, it will remove all callbacks under the `event_name`. | _Optional_ |

### `Spotify.Player\#getCurrentState`

|  |  |
| --- | --- |
| **Description** | Collect metadata on local playback. |
| **Response** | Returns a `Promise`. It will return either a [WebPlaybackState](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackstate-object) object or null depending on if the user is successfully connected. |

**Code Example:**

`player.getCurrentState().then(state => {

if (!state) {

    console.error('User is not playing music through the Web Playback SDK');

    return;

}

var current_track = state.track_window.current_track;

var next_track = state.track_window.next_tracks[0];

console.log('Currently Playing', current_track);

console.log('Playing Next', next_track);

});

`

### `Spotify.Player\#setName`

|  |  |
| --- | --- |
| **Description** | Rename the Spotify Player device. This is visible across all Spotify Connect devices. |
| **Response** | Returns a `Promise`. |

**Code Example:**

`player.setName("My New Player Name").then(() => {

console.log('Player name updated!');

});

`

| Parameter Name | Type | Description | Required |
| --- | --- | --- | --- |
| `name` | String | The new desired player name. | **Required** |

### `Spotify.Player\#getVolume`

|  |  |
| --- | --- |
| **Description** | Get the local volume currently set in the Web Playback SDK. |
| **Response** | Returns a `Promise` containing the local volume (as a `Float` between **0** and **1**). |

**Code Example:**

`player.getVolume().then(volume => {

let volume_percentage = volume * 100;

console.log('The volume of the player is ${volume_percentage}%');

});

`

### `Spotify.Player\#setVolume`

|  |  |
| --- | --- |
| **Description** | Set the local volume for the Web Playback SDK. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`player.setVolume(0.5).then(() => {

console.log('Volume updated!');

});

`

| Parameter Name | Type | Description | Required |
| --- | --- | --- | --- |
| `volume` | Float | The new desired volume for local playback. Between 0 and 1. Note: On iOS devices, the audio level is always under the user’s physical control. The volume property is not settable in JavaScript. Reading the volume property always returns 1. More details can be found in the [iOS-specific Considerations documentation page by Apple](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html). | **Required** |

### `Spotify.Player\#pause`

|  |  |
| --- | --- |
| **Description** | Pause the local playback. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`player.pause().then(() => {

console.log('Paused!');

});

`

### `Spotify.Player\#resume`

|  |  |
| --- | --- |
| **Description** | Resume the local playback. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`player.resume().then(() => {

console.log('Resumed!');

});

`

### `Spotify.Player\#togglePlay`

|  |  |
| --- | --- |
| **Description** | Resume/pause the local playback. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`player.togglePlay().then(() => {

console.log('Toggled playback!');

});

`

### `Spotify.Player\#seek`

|  |  |
| --- | --- |
| **Description** | Seek to a position in the current track in local playback. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`// Seek to a minute into the track

player.seek(60 * 1000).then(() => {

console.log('Changed position!');

});

`

| Parameter Name | Type | Description | Required |
| --- | --- | --- | --- |
| `position_ms` | Integer | The position in milliseconds to seek to. | **Required** |

### `Spotify.Player\#previousTrack`

|  |  |
| --- | --- |
| **Description** | Switch to the previous track in local playback. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`player.previousTrack().then(() => {

console.log('Set to previous track!');

});

`

### `Spotify.Player\#nextTrack`

|  |  |
| --- | --- |
| **Description** | Skip to the next track in local playback. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`player.nextTrack().then(() => {

console.log('Skipped to next track!');

});

`

### `Spotify.Player\#activateElement`

|  |  |
| --- | --- |
| **Description** | Some browsers prevent autoplay of media by ensuring that all playback is triggered by synchronous event-paths originating from user interaction such as a click. In the autoplay disabled browser, to be able to keep the playing state during transfer from other applications to yours, this function needs to be called in advance. Otherwise it will be in pause state once it’s transferred. |
| **Response** | Returns an empty `Promise` |

**Code Example:**

`myActivateElementButton.addEventListener('click', () => {

// The player is activated. The player will keep the

// playing state once the state is transferred from other

// applications.

player.activateElement();

});

// Transfer your currently playing track into your

// application through device picker in Spotify APP.

`

## Events

### `ready`

|  |  |
| --- | --- |
| **Description** | Emitted when the Web Playback SDK has successfully connected and is ready to stream content in the browser from Spotify. |
| **Response** | Returns a [WebPlaybackPlayer](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackplayer-object) object. |

**Code Example:**

`player.addListener('ready', ({ device_id }) => {

console.log('Connected with Device ID', device_id);

});

`

### `not_ready`

|  |  |
| --- | --- |
| **Description** | Emitted when the Web Playback SDK is not ready to play content, typically due to no internet connection. |
| **Response** | Returns a [WebPlaybackPlayer](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackplayer-object) object. |

**Code Example:**

`player.addListener('not_ready', ({ device_id }) => {

console.log('Device ID is not ready for playback', device_id);

});

`

### `player_state_changed`

|  |  |
| --- | --- |
| **Description** | Emitted when the state of the local playback has changed. It may be also executed in random intervals. |
| **Response** | Returns a [WebPlaybackPlayer](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackplayer-object) object. |

**Code Example:**

`player.addListener('player_state_changed', ({

position,

duration,

track_window: { current_track }

}) => {

console.log('Currently Playing', current_track);

console.log('Position in Song', position);

console.log('Duration of Song', duration);

});

`

### `autoplay_failed`

|  |  |
| --- | --- |
| **Description** | Emitted when playback is prohibited by the browser’s autoplay rules. Check [Spotify.Player#activateElement](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayeractivateelement) for more information. |
| **Response** | Returns `null` |

**Code Example:**

`player.addListener('autoplay_failed', () => {

console.log('Autoplay is not allowed by the browser autoplay rules');

});

`

## Errors

### `initialization_error`

|  |  |
| --- | --- |
| **Description** | Emitted when the `Spotify.Player` fails to instantiate a player capable of playing content in the current environment. Most likely due to the browser not supporting EME protection. |

**Code Example:**

`player.on('initialization_error', ({ message }) => {

console.error('Failed to initialize', message);

});

`

### `authentication_error`

|  |  |
| --- | --- |
| **Description** | Emitted when the `Spotify.Player` fails to instantiate a valid Spotify connection from the access token provided to `getOAuthToken`. |

**Code Example:**

`player.on('authentication_error', ({ message }) => {

console.error('Failed to authenticate', message);

});

`

### `account_error`

|  |  |
| --- | --- |
| **Description** | Emitted when the user authenticated does not have a valid Spotify Premium subscription. |

**Code Example:**

`player.on('account_error', ({ message }) => {

console.error('Failed to validate Spotify account', message);

});

`

### `playback_error`

|  |  |
| --- | --- |
| **Description** | Emitted when loading and/or playing back a track failed. |

**Code Example:**

`player.on('playback_error', ({ message }) => {

console.error('Failed to perform playback', message);

});

`

## Objects

### WebPlaybackPlayer Object

This is an object that is provided in the [ready](https://developer.spotify.com/documentation/web-playback-sdk/reference#ready) event as an argument.
WebPlaybackPlayer objects contain information related to the current player
instance of the Web Playback SDK.

`{ device_id: "c349add90ccf047f4e737492b69ba912bdc55f6a" }

`

### WebPlaybackState Object

This is an object that is provided every time [Spotify.Player#getCurrentState](https://developer.spotify.com/documentation/web-playback-sdk/reference#spotifyplayergetcurrentstate) is
called. It contains information on context, permissions, playback state, the
user’s session, and more.

``{

context: {

    uri: 'spotify:album:xxx', // The URI of the context (can be null)

    metadata: {},             // Additional metadata for the context (can be null)

},

disallows: {                // A simplified set of restriction controls for

    pausing: false,           // The current track. By default, these fields

    peeking_next: false,      // will either be set to false or undefined, which

    peeking_prev: false,      // indicates that the particular operation is

    resuming: false,          // allowed. When the field is set to `true`, this

    seeking: false,           // means that the operation is not permitted. For

    skipping_next: false,     // example, `skipping_next`, `skipping_prev` and

    skipping_prev: false      // `seeking` will be set to `true` when playing an

                              // ad track.

},

paused: false,  // Whether the current track is paused.

position: 0,    // The position_ms of the current track.

repeat_mode: 0, // The repeat mode. No repeat mode is 0,

                  // repeat context is 1 and repeat track is 2.

shuffle: false, // True if shuffled, false otherwise.

track_window: {

    current_track: <WebPlaybackTrack>,                              // The track currently on local playback

    previous_tracks: [<WebPlaybackTrack>, <WebPlaybackTrack>, ...], // Previously played tracks. Number can vary.

    next_tracks: [<WebPlaybackTrack>, <WebPlaybackTrack>, ...]      // Tracks queued next. Number can vary.

}

}

``

### WebPlaybackTrack Object

This is an object that is provided inside `track_window` from the
[WebPlaybackState Object](https://developer.spotify.com/documentation/web-playback-sdk/reference#webplaybackstate-object). Track objects are [Spotify Web API](https://developer.spotify.com/documentation/web-api) compatible objects
containing metadata on Spotify content.

`{

uri: "spotify:track:xxxx", // Spotify URI

id: "xxxx",                // Spotify ID from URI (can be null)

type: "track",             // Content type: can be "track", "episode" or "ad"

media_type: "audio",       // Type of file: can be "audio" or "video"

name: "Song Name",         // Name of content

is_playable: true,         // Flag indicating whether it can be played

album: {

    uri: 'spotify:album:xxxx', // Spotify Album URI

    name: 'Album Name',

    images: [\
\
      { url: "https://image/xxxx" }\
\
    ]

},

artists: [\
\
    { uri: 'spotify:artist:xxxx', name: "Artist Name" }\
\
]

}

`

### WebPlaybackError Object

This is an object that is provided in all error handlers from the Web Playback SDK. It is referred to as e and looks like this:

`{ message: "This will contain a message explaining the error." }

`