Source: https://developer.apple.com/documentation/applemusicapi
Title: Apple Music API | Apple Developer Documentation
Fetched: 2026-09-08T00:36:26.934Z

* * *

* * *

[Skip Navigation](https://developer.apple.com/documentation/applemusicapi#app-main)

Web Service

# Apple Music API

Integrate streaming music with catalog and personal content.

Apple Music 1.0+

## [Overview](https://developer.apple.com/documentation/applemusicapi\#overview)

Use Apple Music API to access information about media in the Apple Music Catalog and a user’s personal iCloud Music Library.

- Apple Music Catalog includes all resources available in Apple Music.

- iCloud Music Library contains only those resources the user adds to their personal library. For example, it contains items from Apple Music, songs purchased from iTunes Store, and imports from discs and other apps. This library can include content that’s not in the Apple Music Catalog.


Use this API to retrieve information about albums, songs, artists, playlists, music videos, Apple Music stations, ratings, charts, recommendations, and the user’s most-recently played content. With proper authorization from the user, you can also create or modify playlists and apply ratings to the user’s content.

## [Topics](https://developer.apple.com/documentation/applemusicapi\#topics)

### [Essentials](https://developer.apple.com/documentation/applemusicapi\#Essentials)

[Generating Developer Tokens](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)

Generate a developer token needed to make requests to Apple Music API.

[User Authentication for MusicKit](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)

Authenticate requests for user data using the Music User Token.

[Handling Requests and Responses](https://developer.apple.com/documentation/applemusicapi/handling-requests-and-responses)

Write a request and handle responses from the API.

[Handling Resource Representation and Relationships](https://developer.apple.com/documentation/applemusicapi/handling-resource-representation-and-relationships)

Fetch resources with extended attributes and included relationships and relationship views.

[API Reference\\
Storefronts and Localization](https://developer.apple.com/documentation/applemusicapi/storefronts-and-localization)

Pick a region-specific geographic location from which to retrieve catalog information, or retrieve information from the user’s personal library.

[API Reference\\
Common Objects](https://developer.apple.com/documentation/applemusicapi/common-objects)

Understand the common JSON objects that framework responses contain.

[Managing Content Ratings, Alternate Versions, and Equivalencies](https://developer.apple.com/documentation/applemusicapi/managing-content-ratings-alternate-versions-and-equivalencies)

Handle multiple and alternate versions of content.

[Fetching Resources by Page](https://developer.apple.com/documentation/applemusicapi/fetching-resources-by-page)

Use pagination to fetch the next set of objects.

### [Albums, Artists, Songs, and Videos](https://developer.apple.com/documentation/applemusicapi\#Albums-Artists-Songs-and-Videos)

[API Reference\\
Albums](https://developer.apple.com/documentation/applemusicapi/albums-api)

Get an album’s name, artist, list of tracks, artwork, release date, and recording information, and add new albums to the user’s library.

[API Reference\\
Artists](https://developer.apple.com/documentation/applemusicapi/artists-api)

Get information about an artist, including the content they created and references to them in playlists and radio stations.

[API Reference\\
Songs](https://developer.apple.com/documentation/applemusicapi/songs-api)

Get information about a particular song, including the artist who created it and the album on which it appeared.

[API Reference\\
Music Videos](https://developer.apple.com/documentation/applemusicapi/music-videos-api)

Get information about a music video, including the artist who created it and the associated album, and add new videos to the user’s library.

### [Playlists and Stations](https://developer.apple.com/documentation/applemusicapi\#Playlists-and-Stations)

[API Reference\\
Playlists](https://developer.apple.com/documentation/applemusicapi/playlists-api)

Get the contents of playlists, add new playlists to the user’s library, and add tracks to an existing playlist.

[API Reference\\
Apple Music Stations](https://developer.apple.com/documentation/applemusicapi/apple-music-stations)

Get information about streaming content offered by Apple Music.

### [Search](https://developer.apple.com/documentation/applemusicapi\#Search)

[API Reference\\
Search](https://developer.apple.com/documentation/applemusicapi/search)

Search for albums, songs, artists, and other information in the user’s personal library or the Apple Music Catalog.

### [Ratings, Genres, and Charts](https://developer.apple.com/documentation/applemusicapi\#Ratings-Genres-and-Charts)

[API Reference\\
Ratings](https://developer.apple.com/documentation/applemusicapi/ratings-api)

Get and set ratings for albums, songs, playlists, music videos, and stations.

[API Reference\\
Music Genres](https://developer.apple.com/documentation/applemusicapi/music-genres)

Get information about the genres of the user’s music or items in the Apple Music Catalog.

[API Reference\\
Charts](https://developer.apple.com/documentation/applemusicapi/charts-api)

Get chart information that shows the popularity of albums, songs, and music videos.

### [Activities, Curators, and Record Labels](https://developer.apple.com/documentation/applemusicapi\#Activities-Curators-and-Record-Labels)

[API Reference\\
Activities](https://developer.apple.com/documentation/applemusicapi/activities-api)

Get request and response activities associated with the Apple Music Catalog.

[API Reference\\
Curators](https://developer.apple.com/documentation/applemusicapi/curators-api)

Get information about the person who curated a playlist or station.

[API Reference\\
Record Labels](https://developer.apple.com/documentation/applemusicapi/record-labels-api)

Get information on record labels in the Apple Music Catalog.

### [Adding a resource to favorites](https://developer.apple.com/documentation/applemusicapi\#Adding-a-resource-to-favorites)

[`Add resource to favorites`](https://developer.apple.com/documentation/applemusicapi/add-resource-to-favorites)

Add the user’s resource to favorites.

### [Getting a user’s replay data](https://developer.apple.com/documentation/applemusicapi\#Getting-a-users-replay-data)

[`Get the user's replay data`](https://developer.apple.com/documentation/applemusicapi/get-the-user's-replay-data)

Fetch the user’s replay data for the latest eligible year.

### [Recommendations and history](https://developer.apple.com/documentation/applemusicapi\#Recommendations-and-history)

[API Reference\\
Recommendations](https://developer.apple.com/documentation/applemusicapi/recommendations)

Get music recommendations based on the user’s library and purchase history.

[API Reference\\
History](https://developer.apple.com/documentation/applemusicapi/history)

Get historical information about the songs and stations the user played recently.

### [Fetching Multiple Resource Types](https://developer.apple.com/documentation/applemusicapi\#Fetching-Multiple-Resource-Types)

[`Get Multiple Catalog Resources Using Resource-Typed ID Parameters`](https://developer.apple.com/documentation/applemusicapi/get-multiple-catalog-resources-by-resource-typed-ids-parameters)

Fetch one or more catalog resources by using their identifiers.

[`Get Multiple Library Resources Using Resource-Typed ID Parameters`](https://developer.apple.com/documentation/applemusicapi/get-multiple-library-resources-by-resource-typed-ids-parameters)

Fetch one or more library resources by using their identifiers.

### [Endpoints](https://developer.apple.com/documentation/applemusicapi\#Endpoints)

[`Placeholder Endpoint to Test Connectivity`](https://developer.apple.com/documentation/applemusicapi/dummy-endpoint-to-test-connectivity)

[`Get a User's Storefront`](https://developer.apple.com/documentation/applemusicapi/get-a-user's-storefront)

Fetch a storefront for a specific user.

### [Dictionaries](https://developer.apple.com/documentation/applemusicapi\#Dictionaries)

[`object AlbumPeriodSummaries`](https://developer.apple.com/documentation/applemusicapi/albumperiodsummaries)

The album for the period summary.

[`object ArtistPeriodSummaries`](https://developer.apple.com/documentation/applemusicapi/artistperiodsummaries)

The artist for the period summary.

[`object Artwork`](https://developer.apple.com/documentation/applemusicapi/artwork)

An object that represents artwork.

[`object DescriptionAttribute`](https://developer.apple.com/documentation/applemusicapi/descriptionattribute)

An object that represents a description attribute.

[`object EditorialNotes`](https://developer.apple.com/documentation/applemusicapi/editorialnotes)

An object that represents a notes attribute.

[`object LangageTagResponse`](https://developer.apple.com/documentation/applemusicapi/langagetagresponse)

The response to a language tag request.

[`object MusicSummaries`](https://developer.apple.com/documentation/applemusicapi/musicsummaries)

The music for the period summary.

[`object MusicSummariesResponse`](https://developer.apple.com/documentation/applemusicapi/musicsummariesresponse)

[`object PaginatedResourceCollectionResponse`](https://developer.apple.com/documentation/applemusicapi/paginatedresourcecollectionresponse)

A response object composed of paginated resource objects for the request.

[`object PlayParameters`](https://developer.apple.com/documentation/applemusicapi/playparameters)

An object that represents play parameters for resources.

[`object Preview`](https://developer.apple.com/documentation/applemusicapi/preview)

An object that represents a preview for resources.

[`object RelationshipResponse`](https://developer.apple.com/documentation/applemusicapi/relationshipresponse)

The response for a direct resource relationship fetch.

[`object RelationshipViewResponse`](https://developer.apple.com/documentation/applemusicapi/relationshipviewresponse)

The response for a direct resource view fetch.

[`object SongPeriodSummaries`](https://developer.apple.com/documentation/applemusicapi/songperiodsummaries)

The song for the period summary.

[`object StorefrontsResponse`](https://developer.apple.com/documentation/applemusicapi/storefrontsresponse)

The response to a storefront request.

[`object View`](https://developer.apple.com/documentation/applemusicapi/view)

A to-one or to-many relationship view from one resource object to others representing interesting associations.

## [See Also](https://developer.apple.com/documentation/applemusicapi\#see-also)

### [Related Documentation](https://developer.apple.com/documentation/applemusicapi\#Related-Documentation)

[Media Player](https://developer.apple.com/documentation/mediaplayer)

Find and play songs, audio podcasts, audio books, and more from within your app.

[StoreKit](https://developer.apple.com/documentation/storekit)

Support In-App Purchases and interactions with the App Store.

Current page is Apple Music API