Source: https://www.w3.org/TR/activitystreams-vocabulary
Title: Activity Vocabulary
Fetched: 2026-09-08T00:39:16.456Z

[↑Jump to Table of Contents](https://www.w3.org/TR/activitystreams-vocabulary/#toc) [←Collapse Sidebar](https://www.w3.org/TR/activitystreams-vocabulary/#toc)

[![W3C](https://www.w3.org/StyleSheets/TR/2016/logos/W3C)](https://www.w3.org/)

# Activity Vocabulary

## W3C Recommendation 23 May 2017

This version:[https://www.w3.org/TR/2017/REC-activitystreams-vocabulary-20170523/](https://www.w3.org/TR/2017/REC-activitystreams-vocabulary-20170523/)Latest published version:[https://www.w3.org/TR/activitystreams-vocabulary/](https://www.w3.org/TR/activitystreams-vocabulary/)Latest editor's draft:[http://w3c.github.io/activitystreams/vocabulary/](http://w3c.github.io/activitystreams/vocabulary/)Test suite:[https://github.com/w3c/activitystreams/tree/master/test](https://github.com/w3c/activitystreams/tree/master/test)Implementation report:[https://github.com/w3c/activitystreams/tree/master/implementation-reports](https://github.com/w3c/activitystreams/tree/master/implementation-reports)Previous version:[https://www.w3.org/TR/2017/PR-activitystreams-vocabulary-20170413/](https://www.w3.org/TR/2017/PR-activitystreams-vocabulary-20170413/)Editors:[James M Snell](http://jasnell.me/), IBM[Evan Prodromou](https://fuzzy.ai/about), Fuzzy.aiRepository:[Github](https://github.com/w3c/activitystreams)[Issues](https://github.com/w3c/activitystreams/issues)[Commits](https://github.com/w3c/activitystreams/commits/master)Test:[Validator](https://as2.rocks/)

Please check the [**errata**](https://github.com/w3c/activitystreams/blob/master/ERRATA.md) for any errors or issues reported since publication.


The English version of this specification is the only normative version. Non-normative [translations](https://www.w3.org/2003/03/Translations/byTechnology?technology=https://www.w3.org/TR/activitystreams-vocabulary/) may also be available.


[Copyright](https://www.w3.org/Consortium/Legal/ipr-notice#Copyright) © 2017 Activity Streams Working Group,IBM &
[W3C](https://www.w3.org/) ® ( [MIT](https://www.csail.mit.edu/),
[ERCIM](https://www.ercim.eu/),
[Keio](https://www.keio.ac.jp/), [Beihang](http://ev.buaa.edu.cn/)).
W3C [liability](https://www.w3.org/Consortium/Legal/ipr-notice#Legal_Disclaimer),
[trademark](https://www.w3.org/Consortium/Legal/ipr-notice#W3C_Trademarks) and
[permissive document license](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document) rules apply.


* * *

## Abstract

This specification describes the Activity vocabulary. It is intended to be used in the context of the ActivityStreams 2.0 format and provides a foundational vocabulary for activity structures, and specific activity types.


### Author's Note

_This section is non-normative._

This draft is heavily influenced by the JSON Activity Streams 1.0 specification originally co-authored by Martin Atkins, Will Norris, Chris Messina, Monica Wilkinson, Rob Dolin and James Snell. The author is very thankful for their significant contributions and gladly stands on their shoulders. Some portions of the original text of Activity Streams 1.0 are used in this document.


## Status of This Document

_This section describes the status of this document at the time of its publication. Other documents may supersede this document. A list of current W3C publications and the latest revision of this technical report can be found in the [W3C technical reports index](https://www.w3.org/TR/) at https://www.w3.org/TR/._

This document was published by the [Social Web Working Group](https://www.w3.org/Social/WG) as a Recommendation. Comments regarding this document are welcome. Please send them to
[public-socialweb@w3.org](mailto:public-socialweb@w3.org) ( [subscribe](mailto:public-socialweb-request@w3.org?subject=subscribe),
[archives](https://lists.w3.org/Archives/Public/public-socialweb/)).


Please see the Working Group's [implementation\\
report](https://github.com/w3c/activitystreams/tree/master/implementation-reports).


This document has been reviewed by W3C Members, by software developers, and by other W3C groups and interested parties, and is endorsed by the Director as a W3C Recommendation. It is a stable document and may be used as reference material or cited from another document. W3C's role in making the Recommendation is to draw attention to the specification and to promote its widespread deployment. This enhances the functionality and interoperability of the Web.


This document was produced by a group operating under the
[5 February 2004 W3C Patent\\
Policy](https://www.w3.org/Consortium/Patent-Policy-20040205/).
W3C maintains a [public list of any patent\\
disclosures](https://www.w3.org/2004/01/pp-impl/72531/status) made in connection with the deliverables of the group; that page also includes instructions for disclosing a patent. An individual who has actual knowledge of a patent which the individual believes contains
[Essential\\
Claim(s)](https://www.w3.org/Consortium/Patent-Policy-20040205/#def-essential) must disclose the information in accordance with
[section\\
6 of the W3C Patent Policy](https://www.w3.org/Consortium/Patent-Policy-20040205/#sec-Disclosure).


This document is governed by the [1 March 2017 W3C Process Document](https://www.w3.org/2017/Process-20170301/).


## 1\. Introduction

[The Activity Streams 2.0 Core Syntax](https://www.w3.org/TR/activitystreams-core/) defines the JSON syntax for Activity Streams. This document defines the vocabulary properties.


The Activity Streams 2.0 Vocabulary defines a set of abstract types and properties that describe past, present and future Activities. The vocabulary is defined in two parts:


1. A Core set of properties describing the generalized structure of an Activity; and

2. An Extended set of properties that cover specific types of Activities and Artifacts common to many social Web application systems.


While not all Activity Streams 2.0 implementations are expected to implement support for the Extended properties, all implementations _MUST_ at least be capable of serializing and deserializing the Extended properties in accordance with the
[Activity Streams 2.0 Core Syntax](https://www.w3.org/TR/activitystreams-core/).


The key words " _MUST_", " _MUST NOT_", " _REQUIRED_", " _SHALL_", " _SHALL NOT_", "
_SHOULD_", " _SHOULD NOT_", " _RECOMMENDED_", " _MAY_", and " _OPTIONAL_" in this document are to be interpreted as described in \[[RFC2119](https://www.w3.org/TR/activitystreams-vocabulary/#bib-RFC2119)\].


### 1.1 Conventions

Unless otherwise specified, all properties defined as
`xsd:dateTime` values _MUST_ conform to the rules defined in Activity Streams 2.0 Core,
[Section 2.3](https://www.w3.org/TR/activitystreams-core/#dates).


The examples included in this document use the normative JSON serialization defined by this specification.


## 2\. Core Types

The Activity Vocabulary Core Types provide the basis for the rest of the vocabulary.


Base URI: `https://www.w3.org/ns/activitystreams#`.

The Activity Streams 2.0 Core Types include:


- `Object`
- `Link`
- `Activity`
- `IntransitiveActivity`
- `Collection`
- `OrderedCollection`
- `CollectionPage`
- `OrderedCollectionPage`

| Class | Description | Example |
| --- | --- | --- |
| Object | URI: | `https://www.w3.org/ns/activitystreams#Object` | Example 1<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Object",<br>  "id": "http://www.test.example/object/1",<br>  "name": "A Simple, non-specific object"<br>}<br>``` |
| Notes: | Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as<br> `Activity`,<br> `IntransitiveActivity`,<br> `Collection` and<br> `OrderedCollection`. |
| Disjoint With: | `Link` |
| Properties: | `attachment` \|<br>`attributedTo` \|<br>`audience` \|<br>`content` \|<br>`context` \|<br>`name` \|<br>`endTime` \|<br>`generator` \|<br>`icon` \|<br>`image` \|<br>`inReplyTo` \|<br>`location` \|<br>`preview` \|<br>`published` \|<br>`replies` \|<br>`startTime` \|<br>`summary` \|<br>`tag` \|<br>`updated` \|<br>`url` \|<br>`to` \|<br>`bto` \|<br>`cc` \|<br>`bcc` \|<br>`mediaType` \|<br>`duration` |
| Link | URI: | `https://www.w3.org/ns/activitystreams#Link` | Example 2<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Link",<br>  "href": "http://example.org/abc",<br>  "hreflang": "en",<br>  "mediaType": "text/html",<br>  "name": "An example link"<br>}<br>``` |
| Notes: | A Link is an indirect, qualified reference to a resource identified by a URL. The fundamental model for links is established by \[<br> [RFC5988](https://www.w3.org/TR/activitystreams-vocabulary/#bib-RFC5988)\]. Many of the properties defined by the Activity Vocabulary allow values that are either instances of<br> `Object` or `Link`. When a `Link` is used, it establishes a<br> [qualified relation](http://patterns.dataincubator.org/book/qualified-relation.html) connecting the subject (the containing object) to the resource identified by the `href`. Properties of the `Link` are properties of the reference as opposed to properties of the resource. |
| Disjoint With: | `Object` |
| Properties: | `href` \|<br>`rel` \|<br>`mediaType` \|<br>`name` \|<br>`hreflang` \|<br>`height` \|<br>`width` \|<br>`preview` |
| Activity | URI: | `https://www.w3.org/ns/activitystreams#Activity` | Example 3<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Activity",<br>  "summary": "Sally did something to a note",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Note",<br>    "name": "A Note"<br>  }<br>}<br>``` |
| Notes: | An Activity is a subtype of `Object` that describes some form of action that may happen, is currently happening, or has already happened. The `Activity` type itself serves as an abstract base type for all types of activities. It is important to note that the `Activity` type itself does not carry any specific semantics about the kind of action being taken. |
| Extends: | `Object` |
| Properties: | `actor` \|<br>`object` \|<br>`target` \|<br>`result` \|<br>`origin` \|<br>`instrument`<br>Inherits all properties from `Object`. |
| IntransitiveActivity | URI: | `https://www.w3.org/ns/activitystreams#IntransitiveActivity` | Example 4<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Travel",<br>  "summary": "Sally went to work",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "target": {<br>    "type": "Place",<br>    "name": "Work"<br>  }<br>}<br>``` |
| Notes: | Instances of `IntransitiveActivity` are a subtype of<br> `Activity` representing intransitive actions. The<br> `object` property is therefore inappropriate for these activities. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity` except<br>`object`. |
| Collection | URI: | `https://www.w3.org/ns/activitystreams#Collection` | Example 5<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's notes",<br>  "type": "Collection",<br>  "totalItems": 2,<br>  "items": [<br>    {<br>      "type": "Note",<br>      "name": "A Simple Note"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Another Simple Note"<br>    }<br>  ]<br>}<br>``` |
| Notes: | A `Collection` is a subtype of<br>`Object` that represents ordered or unordered sets of `Object or Link` instances.<br> <br>Refer to the<br>[Activity Streams 2.0 Core](https://www.w3.org/TR/activitystreams-core/#collection) specification for a complete description of the<br>`Collection` type. |
| Extends: | `Object` |
| Properties: | `totalItems` \|<br>`current` \|<br>`first` \|<br>`last` \|<br>`items`<br>Inherits all properties from `Object`. |
| OrderedCollection | URI: | `https://www.w3.org/ns/activitystreams#OrderedCollection` | Example 6<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's notes",<br>  "type": "OrderedCollection",<br>  "totalItems": 2,<br>  "orderedItems": [<br>    {<br>      "type": "Note",<br>      "name": "A Simple Note"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Another Simple Note"<br>    }<br>  ]<br>}<br>``` |
| Notes: | A subtype of `Collection` in which members of the logical collection are assumed to always be strictly ordered. |
| Extends: | `Collection` |
| Properties: | Inherits all properties from `Collection`. |
| CollectionPage | URI: | `https://www.w3.org/ns/activitystreams#CollectionPage` | Example 7<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 1 of Sally's notes",<br>  "type": "CollectionPage",<br>  "id": "http://example.org/foo?page=1",<br>  "partOf": "http://example.org/foo",<br>  "items": [<br>    {<br>      "type": "Note",<br>      "name": "A Simple Note"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Another Simple Note"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Used to represent distinct subsets of items from a<br>`Collection`. Refer to the<br>[Activity Streams 2.0 Core](https://www.w3.org/TR/activitystreams-core/#dfn-collectionpage) for a complete description of the<br>`CollectionPage` object. |
| Extends: | `Collection` |
| Properties: | `partOf` \|<br>`next` \|<br>`prev`<br>Inherits all properties from `Collection`. |
| OrderedCollectionPage | URI: | `https://www.w3.org/ns/activitystreams#OrderedCollectionPage` | Example 8<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 1 of Sally's notes",<br>  "type": "OrderedCollectionPage",<br>  "id": "http://example.org/foo?page=1",<br>  "partOf": "http://example.org/foo",<br>  "orderedItems": [<br>    {<br>      "type": "Note",<br>      "name": "A Simple Note"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Another Simple Note"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Used to represent ordered subsets of items from an<br>`OrderedCollection`. Refer to the<br>[Activity Streams 2.0 Core](https://www.w3.org/TR/activitystreams-core/#dfn-orderedcollectionpage) for a complete description of the<br>`OrderedCollectionPage` object. |
| Extends: | `OrderedCollection` \|<br> `CollectionPage` |
| Properties: | `startIndex`<br>Inherits all properties from<br>`OrderedCollection` and<br>`CollectionPage`. |

## 3\. Extended Types

Base URI: `https://www.w3.org/ns/activitystreams#`.

The Activity Streams 2.0 Extended Types include Activity and Object subtypes that are common to many social Web applications. They are divided into three sets:


- [Activity Types](https://www.w3.org/TR/activitystreams-vocabulary/#activity-types)
- [Actor Types](https://www.w3.org/TR/activitystreams-vocabulary/#actor-types)
- [Object Types](https://www.w3.org/TR/activitystreams-vocabulary/#object-types)

Support for specific extended vocabulary types is expected to vary, with implementations only selecting the extended types and properties that make sense within the specific context and requirements of those applications. However, to avoid possible interoperability issues, implementations _MUST_ avoid using extension types or properties that unduly overlap with or duplicate the extended vocabulary defined here.


### 3.1 Activity Types

All Activity Types inherit the properties of the base [Activity](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-activity) type. Some specific Activity Types are subtypes or specializations of more generalized Activity Types (for instance, the
`Invite` Activity Type is a more specific form of the
`Offer` Activity Type).


The Activity Types include:


- `Accept`
- `Add`
- `Announce`
- `Arrive`
- `Block`
- `Create`
- `Delete`
- `Dislike`
- `Flag`
- `Follow`
- `Ignore`
- `Invite`
- `Join`
- `Leave`
- `Like`
- `Listen`
- `Move`
- `Offer`
- `Question`
- `Reject`
- `Read`
- `Remove`
- `TentativeReject`
- `TentativeAccept`
- `Travel`
- `Undo`
- `Update`
- `View`

| Class | Description | Example |
| --- | --- | --- |
| Accept | URI: | `https://www.w3.org/ns/activitystreams#Accept` | Example 9<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally accepted an invitation to a party",<br>  "type": "Accept",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Invite",<br>    "actor": "http://john.example.org",<br>    "object": {<br>      "type": "Event",<br>      "name": "Going-Away Party for Jim"<br>    }<br>  }<br>}<br>```<br>Example 10<br>```<br>{<br>    "@context": "https://www.w3.org/ns/activitystreams",<br>    "summary": "Sally accepted Joe into the club",<br>    "type": "Accept",<br>    "actor": {<br>      "type": "Person",<br>      "name": "Sally"<br>    },<br>    "object": {<br>      "type": "Person",<br>      "name": "Joe"<br>    },<br>    "target": {<br>      "type": "Group",<br>      "name": "The Club"<br>    }<br>  }<br>``` |
| Notes: | Indicates that the `actor` accepts the<br> `object`. The `target` property can be used in certain circumstances to indicate the context into which the<br> `object` has been accepted. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| TentativeAccept | URI: | `https://www.w3.org/ns/activitystreams#TentativeAccept` | Example 11<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally tentatively accepted an invitation to a party",<br>  "type": "TentativeAccept",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Invite",<br>    "actor": "http://john.example.org",<br>    "object": {<br>      "type": "Event",<br>      "name": "Going-Away Party for Jim"<br>    }<br>  }<br>}<br>``` |
| Notes: | A specialization of `Accept` indicating that the acceptance is tentative. |
| Extends: | `Accept` |
| Properties: | Inherits all properties from `Accept`. |
| Add | URI: | `https://www.w3.org/ns/activitystreams#Add` | Example 12<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally added an object",<br>  "type": "Add",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/abc"<br>}<br>```<br>Example 13<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally added a picture of her cat to her cat picture collection",<br>  "type": "Add",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Image",<br>    "name": "A picture of my cat",<br>    "url": "http://example.org/img/cat.png"<br>  },<br>  "origin": {<br>    "type": "Collection",<br>    "name": "Camera Roll"<br>  },<br>  "target": {<br>    "type": "Collection",<br>    "name": "My Cat Pictures"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` has added the<br> `object` to the `target`. If the<br> `target` property is not explicitly specified, the target would need to be determined implicitly by context. The<br> `origin` can be used to identify the context from which the `object` originated. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Arrive | URI: | `https://www.w3.org/ns/activitystreams#Arrive` | Example 14<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally arrived at work",<br>  "type": "Arrive",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "location": {<br>    "type": "Place",<br>    "name": "Work"<br>  },<br>  "origin": {<br>    "type": "Place",<br>    "name": "Home"<br>  }<br>}<br>``` |
| Notes: | An `IntransitiveActivity` that indicates that the `actor` has arrived at the `location`. The `origin` can be used to identify the context from which the `actor` originated. The `target` typically has no defined meaning. |
| Extends: | `IntransitiveActivity` |
| Properties: | Inherits all properties fom<br> `IntransitiveActivity`. |
| Create | URI: | `https://www.w3.org/ns/activitystreams#Create` | Example 15<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally created a note",<br>  "type": "Create",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Note",<br>    "name": "A Simple Note",<br>    "content": "This is a simple note"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` has created the<br>`object`. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Delete | URI: | `https://www.w3.org/ns/activitystreams#Delete` | Example 16<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally deleted a note",<br>  "type": "Delete",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/notes/1",<br>  "origin": {<br>    "type": "Collection",<br>    "name": "Sally's Notes"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` has deleted the<br> `object`. If specified, the `origin` indicates the context from which the `object` was deleted. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Follow | URI: | `https://www.w3.org/ns/activitystreams#Follow` | Example 17<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally followed John",<br>  "type": "Follow",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Person",<br>    "name": "John"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is "following" the<br> `object`. Following is defined in the sense typically used within Social systems in which the actor is interested in any activity performed by or on the object. The<br> `target` and `origin` typically have no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Ignore | URI: | `https://www.w3.org/ns/activitystreams#Ignore` | Example 18<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally ignored a note",<br>  "type": "Ignore",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/notes/1"<br>}<br>``` |
| Notes: | Indicates that the `actor` is ignoring the<br> `object`. The `target` and<br> `origin` typically have no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Join | URI: | `https://www.w3.org/ns/activitystreams#Join` | Example 19<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally joined a group",<br>  "type": "Join",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Group",<br>    "name": "A Simple Group"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` has joined the<br> `object`. The `target` and<br> `origin` typically have no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Leave | URI: | `https://www.w3.org/ns/activitystreams#Leave` | Example 20<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally left work",<br>  "type": "Leave",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Place",<br>    "name": "Work"<br>  }<br>}<br>```<br>Example 21<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally left a group",<br>  "type": "Leave",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Group",<br>    "name": "A Simple Group"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` has left the<br> `object`. The `target` and<br> `origin` typically have no meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Like | URI: | `https://www.w3.org/ns/activitystreams#Like` | Example 22<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally liked a note",<br>  "type": "Like",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/notes/1"<br>}<br>``` |
| Notes: | Indicates that the `actor` likes, recommends or endorses the `object`. The `target` and<br>`origin` typically have no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Offer | URI: | `https://www.w3.org/ns/activitystreams#Offer` | Example 23<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered 50% off to Lewis",<br>  "type": "Offer",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "http://www.types.example/ProductOffer",<br>    "name": "50% Off!"<br>  },<br>  "target": {<br>    "type": "Person",<br>    "name": "Lewis"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is offering the<br> `object`. If specified, the `target` indicates the entity to which the `object` is being offered. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Invite | URI: | `https://www.w3.org/ns/activitystreams#Invite` | Example 24<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally invited John and Lisa to a party",<br>  "type": "Invite",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Event",<br>    "name": "A Party"<br>  },<br>  "target": [<br>    {<br>      "type": "Person",<br>      "name": "John"<br>    },<br>    {<br>      "type": "Person",<br>      "name": "Lisa"<br>    }<br>  ]<br>}<br>``` |
| Notes: | A specialization of `Offer` in which the<br> `actor` is extending an invitation for the<br> `object` to the `target`. |
| Extends: | `Offer` |
| Properties: | Inherits all properties from `Offer`. |
| Reject | URI: | `https://www.w3.org/ns/activitystreams#Reject` | Example 25<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally rejected an invitation to a party",<br>  "type": "Reject",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Invite",<br>    "actor": "http://john.example.org",<br>    "object": {<br>      "type": "Event",<br>      "name": "Going-Away Party for Jim"<br>    }<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is rejecting the<br> `object`. The `target` and<br> `origin` typically have no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| TentativeReject | URI: | `https://www.w3.org/ns/activitystreams#TentativeReject` | Example 26<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally tentatively rejected an invitation to a party",<br>  "type": "TentativeReject",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Invite",<br>    "actor": "http://john.example.org",<br>    "object": {<br>      "type": "Event",<br>      "name": "Going-Away Party for Jim"<br>    }<br>  }<br>}<br>``` |
| Notes: | A specialization of `Reject` in which the rejection is considered tentative. |
| Extends: | `Reject` |
| Properties: | Inherits all properties from `Reject`. |
| Remove | URI: | `https://www.w3.org/ns/activitystreams#Remove` | Example 27<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally removed a note from her notes folder",<br>  "type": "Remove",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/notes/1",<br>  "target": {<br>    "type": "Collection",<br>    "name": "Notes Folder"<br>  }<br>}<br>```<br>Example 28<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "The moderator removed Sally from a group",<br>  "type": "Remove",<br>  "actor": {<br>    "type": "http://example.org/Role",<br>    "name": "The Moderator"<br>  },<br>  "object": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "origin": {<br>    "type": "Group",<br>    "name": "A Simple Group"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is removing the<br> `object`. If specified, the `origin` indicates the context from which the `object` is being removed. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Undo | URI: | `https://www.w3.org/ns/activitystreams#Undo` | Example 29<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally retracted her offer to John",<br>  "type": "Undo",<br>  "actor": "http://sally.example.org",<br>  "object": {<br>    "type": "Offer",<br>    "actor": "http://sally.example.org",<br>    "object": "http://example.org/posts/1",<br>    "target": "http://john.example.org"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is undoing the<br>`object`. In most cases, the `object` will be an `Activity` describing some previously performed action (for instance, a person may have previously "liked" an article but, for whatever reason, might choose to undo that like at some later point in time).<br> <br>The `target` and `origin` typically have no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Update | URI: | `https://www.w3.org/ns/activitystreams#Update` | Example 30<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally updated her note",<br>  "type": "Update",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/notes/1"<br>}<br>``` |
| Notes: | Indicates that the `actor` has updated the<br>`object`. Note, however, that this vocabulary does not define a mechanism for describing the actual set of modifications made to `object`.<br> <br>The `target` and<br>`origin` typically have no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| View | URI: | `https://www.w3.org/ns/activitystreams#View` | Example 31<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally read an article",<br>  "type": "View",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Article",<br>    "name": "What You Should Know About Activity Streams"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` has viewed the object. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Listen | URI: | `https://www.w3.org/ns/activitystreams#Listen` | Example 32<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally listened to a piece of music",<br>  "type": "Listen",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/music.mp3"<br>}<br>``` |
| Notes: | Indicates that the `actor` has listened to the<br> `object`. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Read | URI: | `https://www.w3.org/ns/activitystreams#Read` | Example 33<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally read a blog post",<br>  "type": "Read",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/posts/1"<br>}<br>``` |
| Notes: | Indicates that the `actor` has read the<br> `object`. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Move | URI: | `https://www.w3.org/ns/activitystreams#Move` | Example 34<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally moved a post from List A to List B",<br>  "type": "Move",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/posts/1",<br>  "target": {<br>    "type": "Collection",<br>    "name": "List B"<br>  },<br>  "origin": {<br>    "type": "Collection",<br>    "name": "List A"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` has moved<br> `object` from `origin` to<br> `target`. If the `origin` or<br> `target` are not specified, either can be determined by context. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Travel | URI: | `https://www.w3.org/ns/activitystreams#Travel` | Example 35<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally went home from work",<br>  "type": "Travel",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "target": {<br>    "type": "Place",<br>    "name": "Home"<br>  },<br>  "origin": {<br>    "type": "Place",<br>    "name": "Work"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is traveling to<br> `target` from `origin`. `Travel` is an `IntransitiveObject` whose `actor` specifies the direct object. If the `target` or<br> `origin` are not specified, either can be determined by context. |
| Extends: | `IntransitiveActivity` |
| Properties: | Inherits all properties from<br> `IntransitiveActivity`. |
| Announce | URI: | `https://www.w3.org/ns/activitystreams#Announce` | Example 36<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally announced that she had arrived at work",<br>  "type": "Announce",<br>  "actor": {<br>    "type": "Person",<br>    "id": "http://sally.example.org",<br>    "name": "Sally"<br>  },<br>  "object": {<br>    "type": "Arrive",<br>    "actor": "http://sally.example.org",<br>    "location": {<br>      "type": "Place",<br>      "name": "Work"<br>    }<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is calling the `target`'s attention the `object`.<br> <br>The `origin` typically has no defined meaning. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Block | URI: | `https://www.w3.org/ns/activitystreams#Block` | Example 37<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally blocked Joe",<br>  "type": "Block",<br>  "actor": "http://sally.example.org",<br>  "object": "http://joe.example.org"<br>}<br>``` |
| Notes: | Indicates that the `actor` is blocking the<br> `object`. Blocking is a stronger form of<br> `Ignore`. The typical use is to support social systems that allow one user to block activities or content of other users. The `target` and `origin` typically have no defined meaning. |
| Extends: | `Ignore` |
| Properties: | Inherits all properties from `Ignore`. |
| Flag | URI: | `https://www.w3.org/ns/activitystreams#Flag` | Example 38<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally flagged an inappropriate note",<br>  "type": "Flag",<br>  "actor": "http://sally.example.org",<br>  "object": {<br>    "type": "Note",<br>    "content": "An inappropriate note"<br>  }<br>}<br>``` |
| Notes: | Indicates that the `actor` is "flagging" the<br> `object`. Flagging is defined in the sense common to many social platforms as reporting content as being inappropriate for any number of reasons. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Dislike | URI: | `https://www.w3.org/ns/activitystreams#Dislike` | Example 39<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally disliked a post",<br>  "type": "Dislike",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1"<br>}<br>``` |
| Notes: | Indicates that the `actor` dislikes the<br> `object`. |
| Extends: | `Activity` |
| Properties: | Inherits all properties from `Activity`. |
| Question | URI: | `https://www.w3.org/ns/activitystreams#Question` | Example 40<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Question",<br>  "name": "What is the answer?",<br>  "oneOf": [<br>    {<br>      "type": "Note",<br>      "name": "Option A"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Option B"<br>    }<br>  ]<br>}<br>```<br>Example 41<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Question",<br>  "name": "What is the answer?",<br>  "closed": "2016-05-10T00:00:00Z"<br>}<br>``` |
| Notes: | Represents a question being asked. Question objects are an extension of `IntransitiveActivity`. That is, the Question object is an Activity, but the direct object is the question itself and therefore it would not contain an<br>`object` property.<br> <br>Either of the `anyOf` and<br>`oneOf` properties _MAY_ be used to express possible answers, but a Question object _MUST NOT_ have both properties. |
| Extends: | `IntransitiveActivity`. |
| Properties: | `oneOf` \| `anyOf` \| `closed`<br> Inherits all properties from<br> `IntransitiveActivity`. |

### 3.2 Actor Types

Actor types are [Object](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-object) types that are capable of performing activities.


The core Actor Types include:


- `Application`
- `Group`
- `Organization`
- `Person`
- `Service`

| Class | Description | Properties |
| --- | --- | --- |
| Application | URI: | `https://www.w3.org/ns/activitystreams#Application` | Example 42<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Application",<br>  "name": "Exampletron 3000"<br>}<br>``` |
| Notes: | Describes a software application. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Group | URI: | `https://www.w3.org/ns/activitystreams#Group` | Example 43<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Group",<br>  "name": "Big Beards of Austin"<br>}<br>``` |
| Notes: | Represents a formal or informal collective of Actors. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Organization | URI: | `https://www.w3.org/ns/activitystreams#Organization` | Example 44<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Organization",<br>  "name": "Example Co."<br>}<br>``` |
| Notes: | Represents an organization. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Person | URI: | `https://www.w3.org/ns/activitystreams#Person` | Example 45<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Person",<br>  "name": "Sally Smith"<br>}<br>``` |
| Notes: | Represents an individual person. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Service | URI: | `https://www.w3.org/ns/activitystreams#Service` | Example 46<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Service",<br>  "name": "Acme Web Service"<br>}<br>``` |
| Notes: | Represents a service of any kind. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |

### 3.3 Object and Link Types

All Object Types inherit the properties of the base [Object](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-object) type. Link Types inherit the properties of the base [Link](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-link) type. Some specific Object Types are subtypes or specializations of more generalized Object Types (for instance, the `Like` Type is a more specific form of the `Activity` type).


The Object Types include:


- `Article`
- `Audio`
- `Document`
- `Event`
- `Image`
- `Note`
- `Page`
- `Place`
- `Profile`
- `Relationship`
- `Tombstone`
- `Video`

The Link Types include:


- `Mention`

| Class | Description | Properties |
| --- | --- | --- |
| Relationship | URI: | `https://www.w3.org/ns/activitystreams#Relationship` | Example 47<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally is an acquaintance of John",<br>  "type": "Relationship",<br>  "subject": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "relationship": "http://purl.org/vocab/relationship/acquaintanceOf",<br>  "object": {<br>    "type": "Person",<br>    "name": "John"<br>  }<br>}<br>``` |
| Notes: | Describes a relationship between two individuals. The `subject` and<br>`object` properties are used to identify the connected individuals.<br> <br>See [5.2Representing Relationships Between Entities](https://www.w3.org/TR/activitystreams-vocabulary/#connections) for additional information. |
| Extends: | `Object` |
| Properties: | `subject` \|<br>`object` \|<br>`relationship`<br>Inherits all properties from `Object`. |
| Article | URI: | `https://www.w3.org/ns/activitystreams#Article` | Example 48<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Article",<br>  "name": "What a Crazy Day I Had",<br>  "content": "<div>... you will never believe ...</div>",<br>  "attributedTo": "http://sally.example.org"<br>}<br>``` |
| Notes: | Represents any kind of multi-paragraph written work. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Document | URI: | `https://www.w3.org/ns/activitystreams#Document` | Example 49<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Document",<br>  "name": "4Q Sales Forecast",<br>  "url": "http://example.org/4q-sales-forecast.pdf"<br>}<br>``` |
| Notes: | Represents a document of any kind. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Audio | URI: | `https://www.w3.org/ns/activitystreams#Audio` | Example 50<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Audio",<br>  "name": "Interview With A Famous Technologist",<br>  "url": {<br>    "type": "Link",<br>    "href": "http://example.org/podcast.mp3",<br>    "mediaType": "audio/mp3"<br>  }<br>}<br>``` |
| Notes: | Represents an audio document of any kind. |
| Extends: | `Document` |
| Properties: | Inherits all properties from `Document`. |
| Image | URI: | `https://www.w3.org/ns/activitystreams#Image` | Example 51<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Image",<br>  "name": "Cat Jumping on Wagon",<br>  "url": [<br>    {<br>      "type": "Link",<br>      "href": "http://example.org/image.jpeg",<br>      "mediaType": "image/jpeg"<br>    },<br>    {<br>      "type": "Link",<br>      "href": "http://example.org/image.png",<br>      "mediaType": "image/png"<br>    }<br>  ]<br>}<br>``` |
| Notes: | An image document of any kind |
| Extends: | `Document` |
| Properties: | Inherits all properties from `Document`. |
| Video | URI: | `https://www.w3.org/ns/activitystreams#Video` | Example 52<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Video",<br>  "name": "Puppy Plays With Ball",<br>  "url": "http://example.org/video.mkv",<br>  "duration": "PT2H"<br>}<br>``` |
| Notes: | Represents a video document of any kind. |
| Extends: | `Document` |
| Properties: | Inherits all properties from `Document`. |
| Note | URI: | `https://www.w3.org/ns/activitystreams#Note` | Example 53<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Note",<br>  "name": "A Word of Warning",<br>  "content": "Looks like it is going to rain today. Bring an umbrella!"<br>}<br>``` |
| Notes: | Represents a short written work typically less than a single paragraph in length. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Page | URI: | `https://www.w3.org/ns/activitystreams#Page` | Example 54<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Page",<br>  "name": "Omaha Weather Report",<br>  "url": "http://example.org/weather-in-omaha.html"<br>}<br>``` |
| Notes: | Represents a Web Page. |
| Extends: | `Document` |
| Properties: | Inherits all properties from `Document`. |
| Event | URI: | `https://www.w3.org/ns/activitystreams#Event` | Example 55<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Event",<br>  "name": "Going-Away Party for Jim",<br>  "startTime": "2014-12-31T23:00:00-08:00",<br>  "endTime": "2015-01-01T06:00:00-08:00"<br>}<br>``` |
| Notes: | Represents any kind of event. |
| Extends: | `Object` |
| Properties: | Inherits all properties from `Object`. |
| Place | URI: | `https://www.w3.org/ns/activitystreams#Place` | Example 56<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Place",<br>  "name": "Work"<br>}<br>```<br>Example 57<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Place",<br>  "name": "Fresno Area",<br>  "latitude": 36.75,<br>  "longitude": 119.7667,<br>  "radius": 15,<br>  "units": "miles"<br>}<br>``` |
| Notes: | Represents a logical or physical location. See<br> [5.3Representing Places](https://www.w3.org/TR/activitystreams-vocabulary/#places) for additional information. |
| Extends: | `Object` |
| Properties: | `accuracy` \|<br>`altitude` \|<br>`latitude` \|<br>`longitude` \|<br>`radius` \|<br>`units`<br> Inherits all properties from `Object`. |
| Mention | URI: | `https://www.w3.org/ns/activitystreams#Mention` | Example 58<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Mention of Joe by Carrie in her note",<br>  "type": "Mention",<br>  "href": "http://example.org/joe",<br>  "name": "Joe"<br>}<br>``` |
| Notes: | A specialized `Link` that represents an @mention. |
| Extends: | `Link` |
| Properties: | Inherits all properties from `Link`. |
| Profile | URI: | `https://www.w3.org/ns/activitystreams#Profile` | Example 59<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Profile",<br>  "summary": "Sally's Profile",<br>  "describes": {<br>    "type": "Person",<br>    "name": "Sally Smith"<br>  }<br>}<br>``` |
| Notes: | A Profile is a content object that describes another Object, typically used to describe [Actor Type](https://www.w3.org/TR/activitystreams-vocabulary/#actor-types) objects. The `describes` property is used to reference the object being described by the profile. |
| Extends: | `Object` |
| Properties: | `describes`<br>Inherits all properties from `Object`. |
| Tombstone | URI: | `https://www.w3.org/ns/activitystreams#Tombstone` | Example 60<br>```<br>{<br>  "type": "OrderedCollection",<br>  "totalItems": 3,<br>  "name": "Vacation photos 2016",<br>  "orderedItems": [<br>    {<br>      "type": "Image",<br>      "id": "http://image.example/1"<br>    },<br>    {<br>      "type": "Tombstone",<br>      "formerType": "Image",<br>      "id": "http://image.example/2",<br>      "deleted": "2016-03-17T00:00:00Z"<br>    },<br>    {<br>      "type": "Image",<br>      "id": "http://image.example/3"<br>    }<br>  ]<br>}<br>``` |
| Notes: | A Tombstone represents a content object that has been deleted. It can be used in [Collection](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-collection) s to signify that there used to be an object at this position, but it has been deleted. |
| Extends: | `Object` |
| Properties: | `formerType` \|<br>`deleted`<br>Inherits all properties from `Object`. |

## 4\. Properties

Base URI: `https://www.w3.org/ns/activitystreams#`.

The common properties include:
`actor` \|
`attachment` \|
`attributedTo` \|
`audience` \|
`bcc` \|
`bto` \|
`cc` \|
`context` \|
`current` \|
`first` \|
`generator` \|
`icon` \|
`id` \|
`image` \|
`inReplyTo` \|
`instrument` \|
`last` \|
`location` \|
`items` \|
`oneOf` \|
`anyOf` \|
`closed` \|
`origin` \|
`next` \|
`object` \|
`prev` \|
`preview` \|
`result` \|
`replies` \|
`tag` \|
`target` \|
`to` \|
`type` \|
`url` \|
`accuracy` \|
`altitude` \|
`content` \|
`name` \|
`duration` \|
`height` \|
`href` \|
`hreflang` \|
`partOf` \|
`latitude` \|
`longitude` \|
`mediaType` \|
`endTime` \|
`published` \|
`startTime` \|
`radius` \|
`rel` \|
`startIndex` \|
`summary` \|
`totalItems` \|
`units` \|
`updated` \|
`width` \|
`subject` \|
`relationship` \|
`describes` \|
`formerType` \|
`deleted`

The "Domain" indicates the type of Object the property term applies to. The "Range" indicates the type of value the property term can have. Certain properties are marked as a "Subproperty Of" another term, meaning that the term is a specialization of the referenced term. For instance,
`actor` is a subproperty of
`attributedTo`. Properties marked as being "Functional" can have only one value. Items not marked as "Functional" can have multiple values.


| Term | Description | Example |
| --- | --- | --- |
| id | URI: | `@id` | Example 61<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "Foo",<br>  "id": "http://example.org/foo"<br>}<br>``` |
| Notes: | Provides the globally unique identifier for an [Object](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-object) or<br> [Link](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-link). |
| Domain: | `Object` \| `Link` |
| Range: | `anyURI` |
| Functional: | True |
| type | URI: | `@type` | Example 62<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A foo",<br>  "type": "http://example.org/Foo"<br>}<br>``` |
| Notes: | Identifies the [Object](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-object) or [Link](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-link) type. Multiple values may be specified. |
| Domain: | `Object` \| `Link` |
| Range: | `anyURI` |
| actor | URI: | `https://www.w3.org/ns/activitystreams#actor` | Example 63<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered the Foo object",<br>  "type": "Offer",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/foo"<br>}<br>```<br>Example 64<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered the Foo object",<br>  "type": "Offer",<br>  "actor": {<br>    "type": "Person",<br>    "id": "http://sally.example.org",<br>    "summary": "Sally"<br>  },<br>  "object": "http://example.org/foo"<br>}<br>```<br>Example 65<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally and Joe offered the Foo object",<br>  "type": "Offer",<br>  "actor": [<br>    "http://joe.example.org",<br>    {<br>      "type": "Person",<br>      "id": "http://sally.example.org",<br>      "name": "Sally"<br>    }<br>  ],<br>  "object": "http://example.org/foo"<br>}<br>``` |
| Notes: | Describes one or more entities that either performed or are expected to perform the activity. Any single activity can have multiple `actor`s. The `actor` _MAY_ be specified using an indirect `Link`. |
| Domain: | `Activity` |
| Range: | `Object` \| `Link` |
| Subproperty Of: | `attributedTo` |
| attachment | URI: | `https://www.w3.org/ns/activitystreams#attachment` | Example 66<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Note",<br>  "name": "Have you seen my cat?",<br>  "attachment": [<br>    {<br>      "type": "Image",<br>      "content": "This is what he looks like.",<br>      "url": "http://example.org/cat.jpeg"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies a resource attached or related to an object that potentially requires special handling. The intent is to provide a model that is at least semantically similar to attachments in email. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| attributedTo | URI: | `https://www.w3.org/ns/activitystreams#attributedTo` | Example 67<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Image",<br>  "name": "My cat taking a nap",<br>  "url": "http://example.org/cat.jpeg",<br>  "attributedTo": [<br>    {<br>      "type": "Person",<br>      "name": "Sally"<br>    }<br>  ]<br>}<br>```<br>Example 68<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Image",<br>  "name": "My cat taking a nap",<br>  "url": "http://example.org/cat.jpeg",<br>  "attributedTo": [<br>    "http://joe.example.org",<br>    {<br>      "type": "Person",<br>      "name": "Sally"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies one or more entities to which this object is attributed. The attributed entities might not be Actors. For instance, an object might be attributed to the completion of another activity. |
| Domain: | `Link` \| `Object` |
| Range: | `Link` \| `Object` |
| audience | URI: | `https://www.w3.org/ns/activitystreams#audience` | Example 69<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "Holiday announcement",<br>  "type": "Note",<br>  "content": "Thursday will be a company-wide holiday. Enjoy your day off!",<br>  "audience": {<br>    "type": "http://example.org/Organization",<br>    "name": "ExampleCo LLC"<br>  }<br>}<br>``` |
| Notes: | Identifies one or more entities that represent the total population of entities for which the object can considered to be relevant. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| bcc | URI: | `https://www.w3.org/ns/activitystreams#bcc` | Example 70<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered a post to John",<br>  "type": "Offer",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1",<br>  "target": "http://john.example.org",<br>  "bcc": [ "http://joe.example.org" ]<br>}<br>``` |
| Notes: | Identifies one or more Objects that are part of the private secondary audience of this Object. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| bto | URI: | `https://www.w3.org/ns/activitystreams#bto` | Example 71<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered a post to John",<br>  "type": "Offer",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1",<br>  "target": "http://john.example.org",<br>  "bto": [ "http://joe.example.org" ]<br>}<br>``` |
| Notes: | Identifies an Object that is part of the private primary audience of this Object. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| cc | URI: | `https://www.w3.org/ns/activitystreams#cc` | Example 72<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered a post to John",<br>  "type": "Offer",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1",<br>  "target": "http://john.example.org",<br>  "cc": [ "http://joe.example.org" ]<br>}<br>``` |
| Notes: | Identifies an Object that is part of the public secondary audience of this Object. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| context | URI: | `https://www.w3.org/ns/activitystreams#context` | Example 73<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Activities in context 1",<br>  "type": "Collection",<br>  "items": [<br>    {<br>      "type": "Offer",<br>      "actor": "http://sally.example.org",<br>      "object": "http://example.org/posts/1",<br>      "target": "http://john.example.org",<br>      "context": "http://example.org/contexts/1"<br>    },<br>    {<br>      "type": "Like",<br>      "actor": "http://joe.example.org",<br>      "object": "http://example.org/posts/2",<br>      "context": "http://example.org/contexts/1"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies the context within which the object exists or an activity was performed.<br> <br>The notion of "context" used is intentionally vague. The intended function is to serve as a means of grouping objects and activities that share a common originating context or purpose. An example could be all activities relating to a common project or event. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| current | URI: | `https://www.w3.org/ns/activitystreams#current` | Example 74<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's blog posts",<br>  "type": "Collection",<br>  "totalItems": 3,<br>  "current": "http://example.org/collection",<br>  "items": [<br>    "http://example.org/posts/1",<br>    "http://example.org/posts/2",<br>    "http://example.org/posts/3"<br>  ]<br>}<br>```<br>Example 75<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's blog posts",<br>  "type": "Collection",<br>  "totalItems": 3,<br>  "current": {<br>    "type": "Link",<br>    "summary": "Most Recent Items",<br>    "href": "http://example.org/collection"<br>  },<br>  "items": [<br>    "http://example.org/posts/1",<br>    "http://example.org/posts/2",<br>    "http://example.org/posts/3"<br>  ]<br>}<br>``` |
| Notes: | In a paged `Collection`, indicates the page that contains the most recently updated member items. |
| Domain: | `Collection` |
| Range: | `CollectionPage` \| `Link` |
| Functional: | True |
| first | URI: | `https://www.w3.org/ns/activitystreams#first` | Example 76<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's blog posts",<br>  "type": "Collection",<br>  "totalItems": 3,<br>  "first": "http://example.org/collection?page=0"<br>}<br>```<br>Example 77<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's blog posts",<br>  "type": "Collection",<br>  "totalItems": 3,<br>  "first": {<br>    "type": "Link",<br>    "summary": "First Page",<br>    "href": "http://example.org/collection?page=0"<br>  }<br>}<br>``` |
| Notes: | In a paged `Collection`, indicates the furthest preceeding page of items in the collection. |
| Domain: | `Collection` |
| Range: | `CollectionPage` \| `Link` |
| Functional: | True |
| generator | URI: | `https://www.w3.org/ns/activitystreams#generator` | Example 78<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "content": "This is all there is.",<br>  "generator": {<br>    "type": "Application",<br>    "name": "Exampletron 3000"<br>  }<br>}<br>``` |
| Notes: | Identifies the entity (e.g. an application) that generated the object. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| icon | URI: | `https://www.w3.org/ns/activitystreams#icon` | Example 79<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "content": "This is all there is.",<br>  "icon": {<br>    "type": "Image",<br>    "name": "Note icon",<br>    "url": "http://example.org/note.png",<br>    "width": 16,<br>    "height": 16<br>  }<br>}<br>```<br>Example 80<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "content": "A simple note",<br>  "icon": [<br>    {<br>      "type": "Image",<br>      "summary": "Note (16x16)",<br>      "url": "http://example.org/note1.png",<br>      "width": 16,<br>      "height": 16<br>    },<br>    {<br>      "type": "Image",<br>      "summary": "Note (32x32)",<br>      "url": "http://example.org/note2.png",<br>      "width": 32,<br>      "height": 32<br>    }<br>  ]<br>}<br>``` |
| Notes: | Indicates an entity that describes an icon for this object. The image should have an aspect ratio of one (horizontal) to one (vertical) and should be suitable for presentation at a small size. |
| Domain: | `Object` |
| Range: | `Image` \| `Link` |
| image | URI: | `https://www.w3.org/ns/activitystreams#image` | Example 81<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "A simple note",<br>  "type": "Note",<br>  "content": "This is all there is.",<br>  "image": {<br>    "type": "Image",<br>    "name": "A Cat",<br>    "url": "http://example.org/cat.png"<br>  }<br>}<br>```<br>Example 82<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "A simple note",<br>  "type": "Note",<br>  "content": "This is all there is.",<br>  "image": [<br>    {<br>      "type": "Image",<br>      "name": "Cat 1",<br>      "url": "http://example.org/cat1.png"<br>    },<br>    {<br>      "type": "Image",<br>      "name": "Cat 2",<br>      "url": "http://example.org/cat2.png"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Indicates an entity that describes an image for this object. Unlike the icon property, there are no aspect ratio or display size limitations assumed. |
| Domain: | `Object` |
| Range: | `Image` \| `Link` |
| inReplyTo | URI: | `https://www.w3.org/ns/activitystreams#inReplyTo` | Example 83<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "content": "This is all there is.",<br>  "inReplyTo": {<br>    "summary": "Previous note",<br>    "type": "Note",<br>    "content": "What else is there?"<br>  }<br>}<br>```<br>Example 84<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "content": "This is all there is.",<br>  "inReplyTo": "http://example.org/posts/1"<br>}<br>``` |
| Notes: | Indicates one or more entities for which this object is considered a response. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| instrument | URI: | `https://www.w3.org/ns/activitystreams#instrument` | Example 85<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally listened to a piece of music on the Acme Music Service",<br>  "type": "Listen",<br>  "actor": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "object": "http://example.org/foo.mp3",<br>  "instrument": {<br>    "type": "Service",<br>    "name": "Acme Music Service"<br>  }<br>}<br>``` |
| Notes: | Identifies one or more objects used (or to be used) in the completion of an `Activity`. |
| Domain: | `Activity` |
| Range: | `Object | Link` |
| last | URI: | `https://www.w3.org/ns/activitystreams#last` | Example 86<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A collection",<br>  "type": "Collection",<br>  "totalItems": 3,<br>  "last": "http://example.org/collection?page=1"<br>}<br>```<br>Example 87<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A collection",<br>  "type": "Collection",<br>  "totalItems": 5,<br>  "last": {<br>    "type": "Link",<br>    "summary": "Last Page",<br>    "href": "http://example.org/collection?page=1"<br>  }<br>}<br>``` |
| Notes: | In a paged `Collection`, indicates the furthest proceeding page of the collection. |
| Domain: | `Collection` |
| Range: | `CollectionPage` \| `Link` |
| Functional: | True |
| location | URI: | `https://www.w3.org/ns/activitystreams#location` | Example 88<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Person",<br>  "name": "Sally",<br>  "location": {<br>    "name": "Over the Arabian Sea, east of Socotra Island Nature Sanctuary",<br>    "type": "Place",<br>    "longitude": 12.34,<br>    "latitude": 56.78,<br>    "altitude": 90,<br>    "units": "m"<br>  }<br>}<br>``` |
| Notes: | Indicates one or more physical or logical locations associated with the object. |
| Domain: | `Object` |
| Range: | `Object | Link` |
| items | URI: | `https://www.w3.org/ns/activitystreams#items` | Example 89<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's notes",<br>  "type": "Collection",<br>  "totalItems": 2,<br>  "items": [<br>    {<br>      "type": "Note",<br>      "name": "Reminder for Going-Away Party"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Meeting 2016-11-17"<br>    }<br>  ]<br>}<br>```<br>Example 90<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's notes",<br>  "type": "OrderedCollection",<br>  "totalItems": 2,<br>  "orderedItems": [<br>    {<br>      "type": "Note",<br>      "name": "Meeting 2016-11-17"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Reminder for Going-Away Party"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies the items contained in a collection. The items might be ordered or unordered. |
| Domain: | `Collection` |
| Range: | `Object` \| `Link` \| Ordered List of \[`Object` \| `Link` \] |
| oneOf | URI: | `https://www.w3.org/ns/activitystreams#oneOf` | Example 91<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Question",<br>  "name": "What is the answer?",<br>  "oneOf": [<br>    {<br>      "type": "Note",<br>      "name": "Option A"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Option B"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies an exclusive option for a Question. Use of<br> `oneOf` implies that the Question can have only a single answer. To indicate that a Question can have multiple answers, use<br> `anyOf`. |
| Domain: | `Question` |
| Range: | `Object` \| `Link` |
| anyOf | URI: | `https://www.w3.org/ns/activitystreams#anyOf` | Example 92<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Question",<br>  "name": "What is the answer?",<br>  "anyOf": [<br>    {<br>      "type": "Note",<br>      "name": "Option A"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Option B"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies an inclusive option for a Question. Use of<br> `anyOf` implies that the Question can have multiple answers. To indicate that a Question can have only one answer, use<br> `oneOf`. |
| Domain: | `Question` |
| Range: | `Object` \| `Link` |
| closed | URI: | `https://www.w3.org/ns/activitystreams#closed` | Example 93<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Question",<br>  "name": "What is the answer?",<br>  "closed": "2016-05-10T00:00:00Z"<br>}<br>``` |
| Notes: | Indicates that a question has been closed, and answers are no longer accepted. |
| Domain: | `Question` |
| Range: | `Object` \| `Link` \|<br> `xsd:dateTime` \| `xsd:boolean` |
| origin | URI: | `https://www.w3.org/ns/activitystreams#origin` | Example 94<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally moved a post from List A to List B",<br>  "type": "Move",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1",<br>  "target": {<br>    "type": "Collection",<br>    "name": "List B"<br>  },<br>  "origin": {<br>    "type": "Collection",<br>    "name": "List A"<br>  }<br>}<br>``` |
| Notes: | Describes an indirect object of the activity _from_ which the activity is directed. The precise meaning of the origin is the object of the English preposition "from". For instance, in the activity "John moved an item to List B from List A", the origin of the activity is "List A". |
| Domain: | `Activity` |
| Range: | `Object` \| `Link` |
| next | URI: | `https://www.w3.org/ns/activitystreams#next` | Example 95<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 2 of Sally's blog posts",<br>  "type": "CollectionPage",<br>  "next": "http://example.org/collection?page=2",<br>  "items": [<br>    "http://example.org/posts/1",<br>    "http://example.org/posts/2",<br>    "http://example.org/posts/3"<br>  ]<br>}<br>```<br>Example 96<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 2 of Sally's blog posts",<br>  "type": "CollectionPage",<br>  "next": {<br>    "type": "Link",<br>    "name": "Next Page",<br>    "href": "http://example.org/collection?page=2"<br>  },<br>  "items": [<br>    "http://example.org/posts/1",<br>    "http://example.org/posts/2",<br>    "http://example.org/posts/3"<br>  ]<br>}<br>``` |
| Notes: | In a paged `Collection`, indicates the next page of items. |
| Domain: | `CollectionPage` |
| Range: | `CollectionPage` \| `Link` |
| Functional: | True |
| object | URI: | `https://www.w3.org/ns/activitystreams#object` | Example 97<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally liked a post",<br>  "type": "Like",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1"<br>}<br>```<br>Example 98<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Like",<br>  "actor": "http://sally.example.org",<br>  "object": {<br>    "type": "Note",<br>    "content": "A simple note"<br>  }<br>}<br>```<br>Example 99<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally liked a note",<br>  "type": "Like",<br>  "actor": "http://sally.example.org",<br>  "object": [<br>    "http://example.org/posts/1",<br>    {<br>      "type": "Note",<br>      "summary": "A simple note",<br>      "content": "That is a tree."<br>    }<br>  ]<br>}<br>``` |
| Notes: | When used within an `Activity`, describes the direct object of the activity. For instance, in the activity "John added a movie to his wishlist", the object of the activity is the movie added.<br> <br>When used within a `Relationship` describes the entity to which the `subject` is related. |
| Domain: | `Activity` \| `Relationship` |
| Range: | `Object` \| `Link` |
| prev | URI: | `https://www.w3.org/ns/activitystreams#prev` | Example 100<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 1 of Sally's blog posts",<br>  "type": "CollectionPage",<br>  "prev": "http://example.org/collection?page=1",<br>  "items": [<br>    "http://example.org/posts/1",<br>    "http://example.org/posts/2",<br>    "http://example.org/posts/3"<br>  ]<br>}<br>```<br>Example 101<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 1 of Sally's blog posts",<br>  "type": "CollectionPage",<br>  "prev": {<br>    "type": "Link",<br>    "name": "Previous Page",<br>    "href": "http://example.org/collection?page=1"<br>  },<br>  "items": [<br>    "http://example.org/posts/1",<br>    "http://example.org/posts/2",<br>    "http://example.org/posts/3"<br>  ]<br>}<br>``` |
| Notes: | In a paged `Collection`, identifies the previous page of items. |
| Domain: | `CollectionPage` |
| Range: | `CollectionPage` \| `Link` |
| Functional: | True |
| preview | URI: | `https://www.w3.org/ns/activitystreams#preview` | Example 102<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Video",<br>  "name": "Cool New Movie",<br>  "duration": "PT2H30M",<br>  "preview": {<br>    "type": "Video",<br>    "name": "Trailer",<br>    "duration": "PT1M",<br>    "url": {<br>      "href": "http://example.org/trailer.mkv",<br>      "mediaType": "video/mkv"<br>    }<br>  }<br>}<br>``` |
| Notes: | Identifies an entity that provides a preview of this object. |
| Domain: | `Link` \| `Object` |
| Range: | `Link` \| `Object` |
| result | URI: | `https://www.w3.org/ns/activitystreams#result` | Example 103<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally checked that her flight was on time",<br>  "type": ["Activity", "http://www.verbs.example/Check"],<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/flights/1",<br>  "result": {<br>    "type": "http://www.types.example/flightstatus",<br>    "name": "On Time"<br>  }<br>}<br>``` |
| Notes: | Describes the result of the activity. For instance, if a particular action results in the creation of a new resource, the result property can be used to describe that new resource. |
| Domain: | `Activity` |
| Range: | `Object` \| `Link` |
| replies | URI: | `https://www.w3.org/ns/activitystreams#replies` | Example 104<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "id": "http://www.test.example/notes/1",<br>  "content": "I am fine.",<br>  "replies": {<br>    "type": "Collection",<br>    "totalItems": 1,<br>    "items": [<br>      {<br>        "summary": "A response to the note",<br>        "type": "Note",<br>        "content": "I am glad to hear it.",<br>        "inReplyTo": "http://www.test.example/notes/1"<br>      }<br>    ]<br>  }<br>}<br>``` |
| Notes: | Identifies a `Collection` containing objects considered to be responses to this object. |
| Domain: | `Object` |
| Range: | `Collection` |
| Functional: | True |
| tag | URI: | `https://www.w3.org/ns/activitystreams#tag` | Example 105<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Image",<br>  "summary": "Picture of Sally",<br>  "url": "http://example.org/sally.jpg",<br>  "tag": [<br>    {<br>      "type": "Person",<br>      "id": "http://sally.example.org",<br>      "name": "Sally"<br>    }<br>  ]<br>}<br>``` |
| Notes: | One or more "tags" that have been associated with an objects. A tag can be any kind of Object. The key difference between<br> `attachment` and `tag` is that the former implies association by inclusion, while the latter implies associated by reference. |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| target | URI: | `https://www.w3.org/ns/activitystreams#target` | Example 106<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered the post to John",<br>  "type": "Offer",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1",<br>  "target": "http://john.example.org"<br>}<br>```<br>Example 107<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered the post to John",<br>  "type": "Offer",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1",<br>  "target": {<br>    "type": "Person",<br>    "name": "John"<br>  }<br>}<br>``` |
| Notes: | Describes the indirect object, or target, of the activity. The precise meaning of the target is largely dependent on the type of action being described but will often be the object of the English preposition "to". For instance, in the activity "John added a movie to his wishlist", the target of the activity is John's wishlist. An activity can have more than one target. |
| Domain: | `Activity` |
| Range: | `Object` \| `Link` |
| to | URI: | `https://www.w3.org/ns/activitystreams#to` | Example 108<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally offered the post to John",<br>  "type": "Offer",<br>  "actor": "http://sally.example.org",<br>  "object": "http://example.org/posts/1",<br>  "target": "http://john.example.org",<br>  "to": [ "http://joe.example.org" ]<br>}<br>``` |
| Notes: | Identifies an entity considered to be part of the public primary audience of an Object |
| Domain: | `Object` |
| Range: | `Object` \| `Link` |
| url | URI: | `https://www.w3.org/ns/activitystreams#url` | Example 109<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Document",<br>  "name": "4Q Sales Forecast",<br>  "url": "http://example.org/4q-sales-forecast.pdf"<br>}<br>```<br>Example 110<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Document",<br>  "name": "4Q Sales Forecast",<br>  "url": {<br>    "type": "Link",<br>    "href": "http://example.org/4q-sales-forecast.pdf"<br>  }<br>}<br>```<br>Example 111<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Document",<br>  "name": "4Q Sales Forecast",<br>  "url": [<br>    {<br>      "type": "Link",<br>      "href": "http://example.org/4q-sales-forecast.pdf",<br>      "mediaType": "application/pdf"<br>    },<br>    {<br>      "type": "Link",<br>      "href": "http://example.org/4q-sales-forecast.html",<br>      "mediaType": "text/html"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies one or more links to representations of the object |
| Domain: | `Object` |
| Range: | `xsd:anyURI` \| `Link` |
| accuracy | URI: | `https://www.w3.org/ns/activitystreams#accuracy` | Example 112<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "Liu Gu Lu Cun, Pingdu, Qingdao, Shandong, China",<br>  "type": "Place",<br>  "latitude": 36.75,<br>  "longitude": 119.7667,<br>  "accuracy": 94.5<br>}<br>``` |
| Notes: | Indicates the accuracy of position coordinates on a<br> `Place` objects. Expressed in properties of percentage. e.g. "94.0" means "94.0% accurate". |
| Domain: | `Place` |
| Range: | `xsd:float` \[>= 0.0f, <= 100.0f\] |
| Functional: | True |
| altitude | URI: | `https://www.w3.org/ns/activitystreams#altitude` | Example 113<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Place",<br>  "name": "Fresno Area",<br>  "altitude": 15.0,<br>  "latitude": 36.75,<br>  "longitude": 119.7667,<br>  "units": "miles"<br>}<br>``` |
| Notes: | Indicates the altitude of a place. The measurement units is indicated using the `units` property. If<br> `units` is not specified, the default is assumed to be "`m`" indicating meters. |
| Domain: | `Object` |
| Range: | `xsd:float` |
| Functional: | True |
| content | URI: | `https://www.w3.org/ns/activitystreams#content` | Example 114<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "content": "A <em>simple</em> note"<br>}<br>```<br>Example 115<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "contentMap": {<br>    "en": "A <em>simple</em> note",<br>    "es": "Una nota <em>sencilla</em>",<br>    "zh-Hans": "一段<em>简单的</em>笔记"<br>  }<br>}<br>```<br>Example 116<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "mediaType": "text/markdown",<br>  "content": "## A simple note\nA simple markdown `note`"<br>}<br>``` |
| Notes: | The content or textual representation of the Object encoded as a JSON string. By default, the value of `content` is HTML. The `mediaType` property can be used in the object to indicate a different content type.<br> <br>The content _MAY_ be expressed using multiple language-tagged values. |
| Domain: | `Object` |
| Range: | `xsd:string` \| `rdf:langString` |
| name | URI: | `https://www.w3.org/ns/activitystreams#name` | Example 117<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Note",<br>  "name": "A simple note"<br>}<br>```<br>Example 118<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Note",<br>  "nameMap": {<br>    "en": "A simple note",<br>    "es": "Una nota sencilla",<br>    "zh-Hans": "一段简单的笔记"<br>  }<br>}<br>``` |
| Notes: | A simple, human-readable, plain-text name for the object. HTML markup _MUST NOT_ be included. The name _MAY_ be expressed using multiple language-tagged values. |
| Domain: | `Object` \| `Link` |
| Range: | `xsd:string` \| `rdf:langString` |
| duration | URI: | `https://www.w3.org/ns/activitystreams#duration` | Example 119<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Video",<br>  "name": "Birds Flying",<br>  "url": "http://example.org/video.mkv",<br>  "duration": "PT2H"<br>}<br>``` |
| Notes: | When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the `duration` property indicates the object's approximate duration. The value _MUST_ be expressed as an `xsd:duration` as defined by \[<br> [xmlschema11-2](https://www.w3.org/TR/activitystreams-vocabulary/#bib-xmlschema11-2)\], section 3.3.6 (e.g. a period of 5 seconds is represented as "`PT5S`"). |
| Domain: | `Object` |
| Range: | `xsd:duration` |
| Functional: | True |
| height | URI: | `https://www.w3.org/ns/activitystreams#height` | Example 120<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Link",<br>  "href": "http://example.org/image.png",<br>  "height": 100,<br>  "width": 100<br>}<br>``` |
| Notes: | On a `Link`, specifies a hint as to the rendering height in device-independent pixels of the linked resource. |
| Domain: | `Link` |
| Range: | `xsd:nonNegativeInteger` |
| Functional: | True |
| href | URI: | `https://www.w3.org/ns/activitystreams#href` | Example 121<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Link",<br>  "href": "http://example.org/abc",<br>  "mediaType": "text/html",<br>  "name": "Previous"<br>}<br>``` |
| Notes: | The target resource pointed to by a `Link`. |
| Domain: | `Link` |
| Range: | `xsd:anyURI` |
| Functional: | True |
| hreflang | URI: | `https://www.w3.org/ns/activitystreams#hreflang` | Example 122<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Link",<br>  "href": "http://example.org/abc",<br>  "hreflang": "en",<br>  "mediaType": "text/html",<br>  "name": "Previous"<br>}<br>``` |
| Notes: | Hints as to the language used by the target resource. Value _MUST_ be a \[[BCP47](https://www.w3.org/TR/activitystreams-vocabulary/#bib-BCP47)\] Language-Tag. |
| Domain: | `Link` |
| Range: | \[[BCP47](https://www.w3.org/TR/activitystreams-vocabulary/#bib-BCP47)\] Language Tag |
| Functional: | True |
| partOf | URI: | `https://www.w3.org/ns/activitystreams#partOf` | Example 123<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 1 of Sally's notes",<br>  "type": "CollectionPage",<br>  "id": "http://example.org/collection?page=1",<br>  "partOf": "http://example.org/collection",<br>  "items": [<br>    {<br>      "type": "Note",<br>      "name": "Pizza Toppings to Try"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Thought about California"<br>    }<br>  ]<br>}<br>``` |
| Notes: | Identifies the `Collection` to which a<br> `CollectionPage` objects items belong. |
| Domain: | `CollectionPage` |
| Range: | `Link` \| `Collection` |
| Functional: | True |
| latitude | URI: | `https://www.w3.org/ns/activitystreams#latitude` | Example 124<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Place",<br>  "name": "Fresno Area",<br>  "latitude": 36.75,<br>  "longitude": 119.7667,<br>  "radius": 15,<br>  "units": "miles"<br>}<br>``` |
| Notes: | The latitude of a place |
| Domain: | `Place` |
| Range: | `xsd:float` |
| Functional: | True |
| longitude | URI: | `https://www.w3.org/ns/activitystreams#longitude` | Example 125<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Place",<br>  "name": "Fresno Area",<br>  "latitude": 36.75,<br>  "longitude": 119.7667,<br>  "radius": 15,<br>  "units": "miles"<br>}<br>``` |
| Notes: | The longitude of a place |
| Domain: | `Place` |
| Range: | `xsd:float` |
| Functional: | True |
| mediaType | URI: | `https://www.w3.org/ns/activitystreams#mediaType` | Example 126<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Link",<br>  "href": "http://example.org/abc",<br>  "hreflang": "en",<br>  "mediaType": "text/html",<br>  "name": "Next"<br>}<br>``` |
| Notes: | When used on a [Link](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-link), identifies the MIME media type of the referenced resource.<br> <br>When used on an [Object](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-object), identifies the MIME media type of the value of the `content` property. If not specified, the `content` property is assumed to contain `text/html` content. |
| Domain: | `Link` \| `Object` |
| Range: | MIME Media Type |
| Functional: | True |
| endTime | URI: | `https://www.w3.org/ns/activitystreams#endTime` | Example 127<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Event",<br>  "name": "Going-Away Party for Jim",<br>  "startTime": "2014-12-31T23:00:00-08:00",<br>  "endTime": "2015-01-01T06:00:00-08:00"<br>}<br>``` |
| Notes: | The date and time describing the actual or expected ending time of the object. When used with an `Activity` object, for instance, the `endTime` property specifies the moment the activity concluded or is expected to conclude. |
| Domain: | `Object` |
| Range: | `xsd:dateTime` |
| Functional: | True |
| published | URI: | `https://www.w3.org/ns/activitystreams#published` | Example 128<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "A simple note",<br>  "type": "Note",<br>  "content": "Fish swim.",<br>  "published": "2014-12-12T12:12:12Z"<br>}<br>``` |
| Notes: | The date and time at which the object was published |
| Domain: | `Object` |
| Range: | `xsd:dateTime` |
| Functional: | True |
| startTime | URI: | `https://www.w3.org/ns/activitystreams#startTime` | Example 129<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Event",<br>  "name": "Going-Away Party for Jim",<br>  "startTime": "2014-12-31T23:00:00-08:00",<br>  "endTime": "2015-01-01T06:00:00-08:00"<br>}<br>``` |
| Notes: | The date and time describing the actual or expected starting time of the object. When used with an `Activity` object, for instance, the `startTime` property specifies the moment the activity began or is scheduled to begin. |
| Domain: | `Object` |
| Range: | `xsd:dateTime` |
| Functional: | True |
| radius | URI: | `https://www.w3.org/ns/activitystreams#radius` | Example 130<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Place",<br>  "name": "Fresno Area",<br>  "latitude": 36.75,<br>  "longitude": 119.7667,<br>  "radius": 15,<br>  "units": "miles"<br>}<br>``` |
| Notes: | The radius from the given latitude and longitude for a Place. The units is expressed by the `units` property. If `units` is not specified, the default is assumed to be "`m`" indicating "meters". |
| Domain: | `Place` |
| Range: | `xsd:float` \[>= 0.0f\] |
| Functional: | True |
| rel | URI: | `https://www.w3.org/ns/activitystreams#rel` | Example 131<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Link",<br>  "href": "http://example.org/abc",<br>  "hreflang": "en",<br>  "mediaType": "text/html",<br>  "name": "Preview",<br>  "rel": ["canonical", "preview"]<br>}<br>``` |
| Notes: | A link relation associated with a `Link`. The value _MUST_ conform to both the \[[HTML5](https://www.w3.org/TR/activitystreams-vocabulary/#bib-HTML5)\] and \[[RFC5988](https://www.w3.org/TR/activitystreams-vocabulary/#bib-RFC5988)\] "link relation" definitions.<br>In the \[[HTML5](https://www.w3.org/TR/activitystreams-vocabulary/#bib-HTML5)\], any string not containing the "space" U+0020, "tab" (U+0009), "LF" (U+000A), "FF" (U+000C), "CR" (U+000D) or "," (U+002C) characters can be used as a valid link relation. |
| Domain: | `Link` |
| Range: | \[[RFC5988](https://www.w3.org/TR/activitystreams-vocabulary/#bib-RFC5988)\] or [\[HTML5\]](https://www.w3.org/TR/html5/document-metadata.html#attr-link-rel) Link Relation |
| startIndex | URI: | `https://www.w3.org/ns/activitystreams#startIndex` | Example 132<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Page 1 of Sally's notes",<br>  "type": "OrderedCollectionPage",<br>  "startIndex": 0,<br>  "orderedItems": [<br>    {<br>      "type": "Note",<br>      "name": "Density of Water"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Air Mattress Idea"<br>    }<br>  ]<br>}<br>``` |
| Notes: | A non-negative integer value identifying the relative position within the logical view of a strictly ordered collection. |
| Domain: | `OrderedCollectionPage` |
| Range: | `xsd:nonNegativeInteger` |
| Functional: | True |
| summary | URI: | `https://www.w3.org/ns/activitystreams#summary` | Example 133<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "Cane Sugar Processing",<br>  "type": "Note",<br>  "summary": "A simple <em>note</em>"<br>}<br>```<br>Example 134<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "Cane Sugar Processing",<br>  "type": "Note",<br>  "summaryMap": {<br>    "en": "A simple <em>note</em>",<br>    "es": "Una <em>nota</em> sencilla",<br>    "zh-Hans": "一段<em>简单的</em>笔记"<br>  }<br>}<br>``` |
| Notes: | A natural language summarization of the object encoded as HTML. Multiple language tagged summaries _MAY_ be provided. |
| Domain: | `Object` |
| Range: | `xsd:string` \| `rdf:langString` |
| totalItems | URI: | `https://www.w3.org/ns/activitystreams#totalItems` | Example 135<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's notes",<br>  "type": "Collection",<br>  "totalItems": 2,<br>  "items": [<br>    {<br>      "type": "Note",<br>      "name": "Which Staircase Should I Use"<br>    },<br>    {<br>      "type": "Note",<br>      "name": "Something to Remember"<br>    }<br>  ]<br>}<br>``` |
| Notes: | A non-negative integer specifying the total number of objects contained by the logical view of the collection. This number might not reflect the actual number of items serialized within the `Collection` object instance. |
| Domain: | `Collection` |
| Range: | `xsd:nonNegativeInteger` |
| Functional: | True |
| units | URI: | `https://www.w3.org/ns/activitystreams#units` | Example 136<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Place",<br>  "name": "Fresno Area",<br>  "latitude": 36.75,<br>  "longitude": 119.7667,<br>  "radius": 15,<br>  "units": "miles"<br>}<br>``` |
| Notes: | Specifies the measurement units for the `radius` and `altitude` properties on a<br> `Place` object. If not specified, the default is assumed to be "`m`" for "meters". |
| Domain: | `Place` |
| Range: | "`cm`" \| "<br> `feet`" \| "<br> `inches`" \| "<br> `km`" \| "<br> `m`" \| "<br> `miles`" \|<br> `xsd:anyURI` |
| Functional: | True |
| updated | URI: | `https://www.w3.org/ns/activitystreams#updated` | Example 137<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "name": "Cranberry Sauce Idea",<br>  "type": "Note",<br>  "content": "Mush it up so it does not have the same shape as the can.",<br>  "updated": "2014-12-12T12:12:12Z"<br>}<br>``` |
| Notes: | The date and time at which the object was updated |
| Domain: | `Object` |
| Range: | `xsd:dateTime` |
| Functional: | True |
| width | URI: | `https://www.w3.org/ns/activitystreams#width` | Example 138<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "type": "Link",<br>  "href": "http://example.org/image.png",<br>  "height": 100,<br>  "width": 100<br>}<br>``` |
| Notes: | On a `Link`, specifies a hint as to the rendering width in device-independent pixels of the linked resource. |
| Domain: | `Link` |
| Range: | `xsd:nonNegativeInteger` |
| Functional: | True |
| subject | URI: | `https://www.w3.org/ns/activitystreams#subject` | Example 139<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally is an acquaintance of John's",<br>  "type": "Relationship",<br>  "subject": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "relationship": "http://purl.org/vocab/relationship/acquaintanceOf",<br>  "object": {<br>    "type": "Person",<br>    "name": "John"<br>  }<br>}<br>``` |
| Notes: | On a `Relationship` object, the `subject` property identifies one of the connected individuals. For instance, for a Relationship object describing "John is related to Sally", `subject` would refer to John. |
| Domain: | `Relationship` |
| Range: | `Link` \| `Object` |
| Functional: | True |
| relationship | URI: | `https://www.w3.org/ns/activitystreams#relationship` | Example 140<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally is an acquaintance of John's",<br>  "type": "Relationship",<br>  "subject": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "relationship": "http://purl.org/vocab/relationship/acquaintanceOf",<br>  "object": {<br>    "type": "Person",<br>    "name": "John"<br>  }<br>}<br>``` |
| Notes: | On a `Relationship` object, the<br> `relationship` property identifies the kind of relationship that exists between<br> `subject` and<br> `object`. |
| Domain: | `Relationship` |
| Range: | `Object` |
| describes | URI: | `https://www.w3.org/ns/activitystreams#describes` | Example 141<br>```<br>{<br>  "@context": "https://www.w3.org/ns/activitystreams",<br>  "summary": "Sally's profile",<br>  "type": "Profile",<br>  "describes": {<br>    "type": "Person",<br>    "name": "Sally"<br>  },<br>  "url": "http://sally.example.org"<br>}<br>``` |
| Notes: | On a `Profile` object, the<br> `describes` property identifies the object described by the Profile. |
| Domain: | `Profile` |
| Range: | `Object` |
| Functional: | True |
| formerType | URI: | `https://www.w3.org/ns/activitystreams#formerType` | Example 142<br>```<br>{<br>"@context": "https://www.w3.org/ns/activitystreams",<br>"summary": "This image has been deleted",<br>"type": "Tombstone",<br>"formerType": "Image",<br>"url": "http://example.org/image/2"<br>}<br>``` |
| Notes: | On a `Tombstone` object, the<br> `formerType` property identifies the type of the object that was deleted. |
| Domain: | `Tombstone` |
| Range: | `Object` |
| Functional: | False |
| deleted | URI: | `https://www.w3.org/ns/activitystreams#deleted` | Example 143<br>```<br>{<br>"@context": "https://www.w3.org/ns/activitystreams",<br>"summary": "This image has been deleted",<br>"type": "Tombstone",<br>"deleted": "2016-05-03T00:00:00Z"<br>}<br>``` |
| Notes: | On a `Tombstone` object, the<br> `deleted` property is a timestamp for when the object was deleted. |
| Domain: | `Tombstone` |
| Range: | `xsd:dateTime` |
| Functional: | True |

## 5\. Implementation Notes

### 5.1 Audience Targeting

Conceptually, every Object has both a Primary and Secondary audience. The Primary audience consists of those entities directly involved or owning the object. The Secondary audience consists of the collection of entities sharing an interest in the object but who might not be directly involved (e.g."followers").


For instance, suppose a social network of three individuals: Bob, Joe and Jane. Bob and Joe are each friends with Jane but are not friends with one another. Bob has chosen to "follow" activities for which Jane is directly involved. Jane shares a file with Joe.


In this example, Jane and Joe are each directly involved in the file sharing activity and together make up the Primary Audience for that event. Bob, having an interest in activities involving Jane, is the Secondary Audience. Knowing this, a system that produces or consumes the activity can intelligently notify each person of the event.


While there are means (based on the action type, actor, object and target of the activity) to infer the primary audience for many types of activities, heuristics do not work in every case and do not provide a means of identifying the secondary audience. The
`to`, `cc`, `bto` and `bcc` properties _MAY_ be used within an Object to explicitly identify the Primary and Secondary audiences.


The prototypical use case for an Object containing these properties is the publication and redistribution of objects through an intermediary. That is, an event source generates the object and publishes it to the intermediary which determines a subset of items to display to specific individual users or groups. Such a determination can be made, in part, by identifying the Primary and Secondary Audiences for each object.


When the event source generates the object and specifies values for the `to` and `cc` fields, the intermediary _SHOULD_ redistribute that object with the values of those fields intact, allowing any processor to see who the object has been targeted to. This is precisely the same model used by the `to` and `cc` fields in email systems.


There are situations, however, in which disclosing the identity of specific members of the audience may be inappropriate. For instance, a user may not wish to let other users know that they are interested in various topics, individuals or types of events. To support this option, an implementation generating an object _MAY_ use the
`bto` and `bcc` properties to list entities to whom the object should be privately targeted. When an intermediary receives an object containing these properties, it
_MUST_ remove those values prior to redistributing the object. The intent is that systems _MUST_ consider entities listed within the
`bto` and `bcc` properties as part of the Primary and Secondary audience but _MUST NOT_ disclose that fact to any other party.


Audience targeting information included within an Object only describes the intent of the object creator. With clear exception given to the appropriate handling of `bto` and
`bcc`, this specification leaves it up to implementations to determine how the audience targeting information is used.


#### 5.1.1 Audience and Context

_This section is non-normative._

Activities are rarely isolated events. Often, multiple individual activities will be performed around a similar context or audience. For instance, a collaborators working on a shared project might perform multiple related activities in the process of achieving some goal. Such activities can be logically grouped together using the `context` property, and scoped to a particular audience using the `audience` property.


For instance, the following shows two related activities that share a common `context` and `audience`:


Example 144

```
{
 "@context": "https://www.w3.org/ns/activitystreams",
 "summary": "Activities in Project XYZ",
 "type": "Collection",
 "items": [\
   {\
     "summary": "Sally created a note",\
     "type": "Create",\
     "id": "http://activities.example.com/1",\
     "actor": "http://sally.example.org",\
     "object": {\
      "summary": "A note",\
       "type": "Note",\
       "id": "http://notes.example.com/1",\
       "content": "A note"\
     },\
     "context": {\
       "type": "http://example.org/Project",\
       "name": "Project XYZ"\
     },\
     "audience": {\
       "type": "Group",\
       "name": "Project XYZ Working Group"\
     },\
     "to": "http://john.example.org"\
   },\
   {\
     "summary": "John liked Sally's note",\
     "type": "Like",\
     "id": "http://activities.example.com/1",\
     "actor": "http://john.example.org",\
     "object": "http://notes.example.com/1",\
     "context": {\
       "type": "http://example.org/Project",\
       "name": "Project XYZ"\
     },\
     "audience": {\
       "type": "Group",\
       "name": "Project XYZ Working Group"\
     },\
     "to": "http://sally.example.org"\
   }\
 ]
}
```

### 5.2 Representing Relationships Between Entities

The `Relationship` object is used to represent relationships between individuals. It can be used, for instance, to describe that one person is a friend of another, or that one person is a member of a particular organization. The intent of modeling Relationship in this way is to allow descriptions of activities that operate on the relationships in general, and to allow representation of Collections of relationships.


For instance, many social systems have a notion of a "friends list". These are the collection of individuals that are directly connected within a person's social graph. Suppose we have a user, Sally, with direct relationships to users Joe and Jane. Sally follows Joe's updates while Sally and Jane have a mutual relationship.


Using the `Relationship` object, we can model these relationships as:


Example 145

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "summary": "Sally's friends list",
  "type": "Collection",
  "items": [\
    {\
      "summary": "Sally is influenced by Joe",\
      "type": "Relationship",\
      "subject": {\
        "type": "Person",\
        "name": "Sally"\
      },\
      "relationship": "http://purl.org/vocab/relationship/influencedBy",\
      "object": {\
        "type": "Person",\
        "name": "Joe"\
      }\
    },\
    {\
      "summary": "Sally is a friend of Jane",\
      "type": "Relationship",\
      "subject": {\
        "type": "Person",\
        "name": "Sally"\
      },\
      "relationship": "http://purl.org/vocab/relationship/friendOf",\
      "object": {\
        "type": "Person",\
        "name": "Jane"\
      }\
    }\
  ]
}
```

The `relationship` property specifies the kind of relationship that exists between the two individuals identified by the
`subject` and
`object` properties. Used together, these three properties form what is commonly known as a "
[reified statement](http://patterns.dataincubator.org/book/reified-statement.html)" where `subject` identifies the subject, `relationship` identifies the predicate, and
`object` identifies the object.


While use of reified statements can be problematic and confusing in certain situations, their use within the Activity Streams vocabulary to describe relationships provides a straightforward mechanism of describing changes to an individual's social graph. For instance, to indicate that Sally has created a new relationship to user Matt, an implementer can use the
`Relationship` object together with the
`Create` activity:


Example 146

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "summary": "Sally became a friend of Matt",
  "type": "Create",
  "actor": "http://sally.example.org",
  "object": {
    "type": "Relationship",
    "subject": "http://sally.example.org",
    "relationship": "http://purl.org/vocab/relationship/friendOf",
    "object": "http://matt.example.org",
    "startTime": "2015-04-21T12:34:56"
  }
}
```

Additionally, modeling the relationship in this way allows implementers to articulate additional properties of the relationship itself. For instance, the date and time at which the relationship began or ended.


Implementations may reuse existing vocabularies that have been developed for the purpose of describing relationships, or create their own guided by requirements of their particular implementation. Existing vocabularies include the "
[Friend of a Friend](http://xmlns.com/foaf/spec/)" and "
[Relationship](http://vocab.org/relationship/)" vocabularies.


#### 5.2.1 Modeling "friend requests"

_This section is non-normative._

One common use case for many social platforms is the establishment of symmetrical "friend" relationships, in which one user initially extends a request to another user to establish a new connection. Once the connection is made, both users automatically begin receiving notifications about activities performed by the other, and the established relationship becomes visible in either user's "friends list".


The initial "friend request" can be modeled by composing the
`Offer` and `Relationship` object types as in the following example:


Example 147

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://example.org/connection-requests/123",
  "summary": "Sally requested to be a friend of John",
  "type": "Offer",
  "actor": "acct:sally@example.org",
  "object": {
    "summary": "Sally and John's friendship",
    "id": "http://example.org/connections/123",
    "type": "Relationship",
    "subject": "acct:sally@example.org",
    "relationship": "http://purl.org/vocab/relationship/friendOf",
    "object": "acct:john@example.org"
  },
  "target": "acct:john@example.org"
}
```

Assuming the "friend request" is accepted, the remaining steps in this common application scenario can be represented as a set of distinct activities:


Example 148

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "summary": "Sally and John's relationship history",
  "type": "Collection",
  "items": [\
    {\
      "summary": "John accepted Sally's friend request",\
      "id": "http://example.org/activities/122",\
      "type": "Accept",\
      "actor": "acct:john@example.org",\
      "object": "http://example.org/connection-requests/123",\
      "inReplyTo": "http://example.org/connection-requests/123",\
      "context": "http://example.org/connections/123",\
      "result": [\
        "http://example.org/activities/123",\
        "http://example.org/activities/124",\
        "http://example.org/activities/125",\
        "http://example.org/activities/126"\
      ]\
    },\
    {\
      "summary": "John followed Sally",\
      "id": "http://example.org/activities/123",\
      "type": "Follow",\
      "actor": "acct:john@example.org",\
      "object": "acct:sally@example.org",\
      "context": "http://example.org/connections/123"\
    },\
    {\
      "summary": "Sally followed John",\
      "id": "http://example.org/activities/124",\
      "type": "Follow",\
      "actor": "acct:sally@example.org",\
      "object": "acct:john@example.org",\
      "context": "http://example.org/connections/123"\
    },\
    {\
      "summary": "John added Sally to his friends list",\
      "id": "http://example.org/activities/125",\
      "type": "Add",\
      "actor": "acct:john@example.org",\
      "object": "http://example.org/connections/123",\
      "target": {\
        "type": "Collection",\
        "summary": "John's Connections"\
      },\
      "context": "http://example.org/connections/123"\
    },\
    {\
      "summary": "Sally added John to her friends list",\
      "id": "http://example.org/activities/126",\
      "type": "Add",\
      "actor": "acct:sally@example.org",\
      "object": "http://example.org/connections/123",\
      "target": {\
        "type": "Collection",\
        "summary": "Sally's Connections"\
      },\
      "context": "http://example.org/connections/123"\
    }\
  ]
}
```

As illustrated in this example, accepting the "friend request" results in four additional activities including: John following Sally, Sally following John, John adding the relationship with Sally to his collection of Connections, and Sally adding the relationship with John to her collection of Connections.


In this example,


1. The optional `result` property is used within the `Accept` activity to identify the additional activities that occurred as a result of the accept.

2. The optional `context` property is used to relate the various activities back to a common reference point, which in this example is the relationship being established. The `context` allows an implementation to efficiently group related activities together for display or analytic purposes.


### 5.3 Representing Places

_This section is non-normative._

The `Place` object is used to represent both physical and logical locations. While numerous existing vocabularies exist for describing locations in a variety of ways, inconsistencies and incompatibilities between those vocabularies make it difficult to achieve appropriate interoperability between implementations. The `Place` object is included within the Activity vocabulary to provide a minimal, interoperable starting point for describing locations consistently across Activity Streams 2.0 implementations.


The `Place` object is intentionally flexible. It can, for instance, be used to identify a location simply by name:


Example 149

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Place",
  "name": "San Francisco, CA"
}
```

Or, by `longitude` and `latitude`:


Example 150

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Place",
  "name": "San Francisco, CA",
  "longitude": "122.4167",
  "latitude": "37.7833"
}
```

The `Place` object can also describe an area around a given point using the `radius` property, the
`altitude` of the location, and a degree of
`accuracy`.


While publishers are not required to use these specific properties and _MAY_ make use of other mechanisms for describing locations, consuming implementations that support the
`Place` object _MUST_ support the use of these properties.


### 5.4 Representing Questions

_This section is non-normative._

The `Question` object can be used to express various types of inquiries.


For instance, simple open-ended questions similar to those posted to crowd-sourced question and answer websites:


Example 151

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "name": "A question about robots",
  "id": "http://help.example.org/question/1",
  "type": "Question",
  "content": "I'd like to build a robot to feed my cat. Should I use Arduino or Raspberry Pi?"
}
```

Multiple-choice questions or "polls" are also supported using either the
`oneOf` or `anyOf` properties:


Example 152

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "http://polls.example.org/question/1",
  "name": "A question about robots",
  "type": "Question",
   "content": "I'd like to build a robot to feed my cat. Which platform is best?",
   "oneOf": [\
     {"name": "arduino"},\
     {"name": "raspberry pi"}\
   ]
 }
```

Responses to questions are expressed as
`Objects` containing an
`inReplyto` property referencing the Question.


Example 153

```
{
 "@context": "https://www.w3.org/ns/activitystreams",
 "attributedTo": "http://sally.example.org",
 "inReplyTo": "http://polls.example.org/question/1",
 "name": "arduino"
}
```

Because `Question` objects are also instances of
`Activity`, the `result` property can be used to express the results or outcome of the Question (as appropriate):


Example 154

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "name": "A question about robots",
  "id": "http://polls.example.org/question/1",
  "type": "Question",
   "content": "I'd like to build a robot to feed my cat. Which platform is best?",
   "oneOf": [\
     {"name": "arduino"},\
     {"name": "raspberry pi"}\
   ],
   "replies": {
     "type": "Collection",
     "totalItems": 3,
     "items": [\
       {\
         "attributedTo": "http://sally.example.org",\
         "inReplyTo": "http://polls.example.org/question/1",\
         "name": "arduino"\
       },\
       {\
         "attributedTo": "http://joe.example.org",\
         "inReplyTo": "http://polls.example.org/question/1",\
         "name": "arduino"\
       },\
       {\
         "attributedTo": "http://john.example.org",\
         "inReplyTo": "http://polls.example.org/question/1",\
         "name": "raspberry pi"\
       }\
     ]
   },
   "result": {
     "type": "Note",
     "content": "Users are favoriting &quot;arduino&quot; by a 33% margin."
   }
 }
```

### 5.5 Inverse Activities and "Undo"

_This section is non-normative._

Several of the core [Activity types](https://www.w3.org/TR/activitystreams-vocabulary/#activity-types) are defined as natural inversions of one another. These include:


- `Accept` and `Reject`,
- `Arrive` and `Leave`,
- `Join` and `Leave`,
- `Create` and `Delete`,
- `Like` and `Dislike`

It is important to note that these types of activities are semantically distinct from one another and have no direct relationship on the other. That is, for example, if an actor "likes" a note at one point in time then later "dislikes" it, the "dislike" activity does not "undo" or negate out the prior "like".


The appropriate interpretation for the following is that Sally first liked, then later disliked John's note:


Example 155

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "summary": "History of John's note",
  "type": "Collection",
  "items": [\
    {\
      "summary": "Sally liked John's note",\
      "type": "Like",\
      "actor": "http://sally.example.org",\
      "id": "http://activities.example.com/1",\
      "published": "2015-11-12T12:34:56Z",\
      "object": {\
        "summary": "John's note",\
        "type": "Note",\
        "id": "http://notes.example.com/1",\
        "attributedTo": "http://john.example.org",\
        "content": "My note"\
      }\
    },\
    {\
      "summary": "Sally disliked John's note",\
      "type": "Dislike",\
      "actor": "http://sally.example.org",\
      "id": "http://activities.example.com/2",\
      "published": "2015-12-11T21:43:56Z",\
      "object": {\
        "summary": "John's note",\
        "type": "Note",\
        "id": "http://notes.example.com/1",\
        "attributedTo": "http://john.example.org",\
        "content": "My note"\
      }\
    }\
  ]
 }
```

The `Undo` activity type is defined to provide the specific ability to undo or cancel out a prior activity. The appropriate interpretation for the following, then, is that Sally liked John's note at one point but has explicitly redacted that like later on.


Example 156

```
{
 "@context": "https://www.w3.org/ns/activitystreams",
 "summary": "History of John's note",
 "type": "Collection",
 "items": [\
   {\
     "summary": "Sally liked John's note",\
     "type": "Like",\
     "id": "http://activities.example.com/1",\
     "actor": "http://sally.example.org",\
     "published": "2015-11-12T12:34:56Z",\
     "object": {\
       "summary": "John's note",\
       "type": "Note",\
       "id": "http://notes.example.com/1",\
       "attributedTo": "http://john.example.org",\
       "content": "My note"\
     }\
   },\
   {\
     "summary": "Sally no longer likes John's note",\
     "type": "Undo",\
     "id": "http://activities.example.com/2",\
     "actor": "http://sally.example.org",\
     "published": "2015-12-11T21:43:56Z",\
     "object": "http://activities.example.com/1"\
   }\
 ]
}
```

The end result of the former example is that Sally has indicated that she changed her opinion about John's note and now dislikes it, while in the latter example she currently neither likes or dislikes it.


### 5.6 Mentions, Tags and Other Common Social Microsyntaxes

_This section is non-normative._

Many social software systems use special text-based microsyntaxes that allow users to define special addressing for notifications, linking, or categorization within objects. For example, including text such as "`@username`" within an object's content will often route the object to a special "mentions" or "inbox" stream for a particular user. Likewise, including text such as "
`#topic`" within the object's content will often mark the object as being related to the topic "`topic`". Such mechanisms are commonly referred to as "mentions" and "hashtags", respectively.


While such microsyntaxes _MAY_ be used within the values of the
`content`,
`name`, and `summary` properties on an Activity Streams `Object`, implementations _SHOULD NOT_ be required to parse the values of those properties in order to determine the appropriate routing of notifications, categorization or linking between objects. Instead, publishers _SHOULD_ make appropriate use of the vocabulary terms provided specifically for these purposes.


For example, suppose that an author wishes to send a note of thanks to another user named "@sally" with a hashtag of "#givingthanks". A typical way this message would appear within the content of a note is shown below:


Figure 1A simple note with a mention an a hashtag:

```
 "Thank you @sally for all your hard work! #givingthanks"
```

A typical social software implementation would typically render such a content such that "`@sally`" is replaced with a hyperlink to "@sally"'s social profile page and "`#givingthanks`" is replaced with a hyperlink to a listing of other notes that have been "tagged" with the same topic. Most implementations would also send a special notification to sally letting her know that a note mentioning her has been created.


The following illustrates an equivalent Activity Streams
`Note` object:


Example 157

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "name": "A thank-you note",
  "type": "Note",
  "content": "Thank you <a href='http://sally.example.org'>@sally</a>
      for all your hard work!
      <a href='http://example.org/tags/givingthanks'>#givingthanks</a>",
  "to": {
    "name": "Sally",
    "type": "Person",
    "id": "http://sally.example.org"
  },
  "tag": {
    "id": "http://example.org/tags/givingthanks",
    "name": "#givingthanks"
  }
}
```

The `to` property indicates that the user "@sally" is to be considered part of the [primary\\
audience](https://www.w3.org/TR/activitystreams-vocabulary/#audienceTargeting) of the note and should therefore receive notification. The
`tag` property associates the Note with a reference to "
`http://example.org/tags/givingthanks`". Note that the
`content` still includes the "`@sally`" and "
`#givingthanks`" microsyntaxes but that consuming implementations are not required to parse those in order to make the appropriate associations.


In the case a publisher wishes to indicate a mention without an associated notification, the publisher can use the `Mention` object type as a value of the `tag` property.


Example 158

```
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "name": "A thank-you note",
  "type": "Note",
  "content": "Thank you @sally for all your hard work! #givingthanks",
  "tag": [\
    {\
      "type": "Mention",\
      "href": "http://example.org/people/sally",\
      "name": "@sally"\
    },\
    {\
      "id": "http://example.org/tags/givingthanks",\
      "name": "#givingthanks"\
    }\
  ]
}
```

### 5.7 Origin and Target

The `origin` and `target` properties of an Activity respectively identify the entities _from_ which and
_to_ which the action is directed. For instance, in the English statement, "Sally moved the file from Folder A to Folder B", the
`origin` is "Folder A" and the `target` is "Folder B". This activity is illustrated in the example below:


Example 159

```
{
    "@context": "https://www.w3.org/ns/activitystreams",
    "summary": "Sally moved the sales figures from Folder A to Folder B",
    "type": "Move",
    "actor": "http://sally.example.org",
    "object": {
      "type": "Document",
      "name": "sales figures"
    },
    "origin": {
      "type": "Collection",
      "name": "Folder A"
    },
    "target": {
      "type": "Collection",
      "name": "Folder B"
    }
  }
```

The `origin` property is applicable to any type of activity for which the English preposition "from" can be considered applicable in the sense of identifying the origin, source or provenance of the activity's `object`.


The `target` property is applicable to any type of activity for which the English preposition "to" can be considered applicable in the sense of identifying the indirect object or destination of the activity's `object`.


### 5.8 Activity Type Motivating Use Cases

_This section is non-normative._

The [Activity types](https://www.w3.org/TR/activitystreams-vocabulary/#activity-types) defined in this vocabulary have been primarily selected to address the commonly implemented social use cases described below.


#### 5.8.1 Content Management

The Content Management use case primarily deals with activities that involve the creation, modification or deletion of content. This includes, for instance, activities such as "John created a new note", "Sally updated an article", and "Joe deleted the photo".


Relevant Activities:


- `Create`
- `Delete`
- `Update`

#### 5.8.2 Collection Management

The Collection Management use case primarily deals with activities involving the management of content within collections. Examples of collections include things like folders, albums, friend lists, etc. This includes, for instance, activities such as "Sally added a file to Folder A", "John moved the file from Folder A to Folder B", etc.


Relevant Activities:


- `Add`
- `Move`
- `Remove`

#### 5.8.3 Reactions

The Reactions use case primarily deals with reactions to content. This can include activities such as liking or disliking content, ignoring updates, flagging content as being inappropriate, accepting or rejecting objects, etc.


Relevant Activities:


- `Accept`
- `Block`
- `Dislike`
- `Flag`
- `Ignore`
- `Like`
- `Reject`
- `TentativeAccept`
- `TentativeReject`

#### 5.8.4 Event RSVP

The Event RSVP use case primarily deals with invitations to events and RSVP type responses.


Relevant Activities:


- `Accept`
- `Ignore`
- `Invite`
- `Reject`
- `TentativeAccept`
- `TentativeReject`

#### 5.8.5 Group Management

The Group Management use case primarily deals with management of groups. It can include, for instance, activities such as "John added Sally to Group A", "Sally joined Group A", "Joe left Group A", etc.


Relevant Activities:


- `Add`
- `Join`
- `Leave`
- `Remove`

#### 5.8.6 Content Experience

The Content Experience use case primarily deals with describing activities involving listening to, reading, or viewing content. For instance, "Sally read the article", "Joe listened to the song".


Relevant Activities:


- `Listen`
- `Read`
- `View`

#### 5.8.7 Geo-Social Events

The Geo-Social Events use case primarily deals with activities involving geo-tagging type activities. For instance, it can include activities such as "Joe arrived at work", "Sally left work", and "John is travel from home to work".


Relevant Activities:


- `Arrive`
- `Leave`
- `Travel`

#### 5.8.8 Notification

The Notification use case primarily deals with calling attention to particular objects or notifications.


Relevant Activities:


- `Announce`

#### 5.8.9 Questions

the Questions use case primarily deals with representing inquiries of any type. See [5.4Representing Questions](https://www.w3.org/TR/activitystreams-vocabulary/#questions) for more information.


Relevant Activities:


- `Question`

#### 5.8.10 Relationship Management

The Relationship Management use case primarily deals with representing activities involving the management of interpersonal and social relationships (e.g. friend requests, management of social network, etc). See [5.2Representing Relationships Between Entities](https://www.w3.org/TR/activitystreams-vocabulary/#connections) for more information.


Relevant Activities:


- `Accept`
- `Add`
- `Block`
- `Create`
- `Delete`
- `Follow`
- `Ignore`
- `Invite`
- `Reject`

#### 5.8.11 Negating Activity

The Negating Activity use case primarily deals with the ability to redact previously completed activities. See [5.5Inverse Activities and "Undo"](https://www.w3.org/TR/activitystreams-vocabulary/#inverse) for more information.


Relevant Activities:


- `Undo`

#### 5.8.12 Offers

The Offers use case deals with activities involving offering one object to another. It can include, for instance, activities such as "Company A is offering a discount on purchase of Product Z to Sally", "Sally is offering to add a File to Folder A", etc.


Relevant Activities:


- `Offer`

## A. Non-normative Ontology Definition

_This section is non-normative._

A _non-normative_ turtle definition of the Activity Streams 2.0 vocabulary is provided [here](https://www.w3.org/ns/activitystreams-owl) and/or at [the namespace](https://www.w3.org/ns/activitystreams) as a convenience for implementers wishing to use RDF mechanisms for processing Activity Streams 2.0. Note, however, that this document provides the normative definition of the Activity Streams 2.0 vocabulary.


## B. Changelog

_This section is non-normative._

The following notable changes have been made to this document since the previous candidate recommendation of [2016-12-15](https://www.w3.org/TR/2016/CR-activitystreams-vocabulary-20161215/#changelog).


- Removed the four normative `relationship` values for lack of implementation. Changed examples to use terms from the
   [Relationship](http://vocab.org/relationship/) vocabulary.

- Removed process sections, especially those noting exit criteria and at-risk features.

- Fixed a typo in `deleted` range.

- Added `datetime` and `boolean` to range of
   `closed` property.

- Set the domain of the `first`,
   `last`, and `current` properties to
   `Collection`.


## C. References

### C.1 Normative references

\[BCP47\][Tags for Identifying Languages](https://tools.ietf.org/html/bcp47). A. Phillips; M. Davis. IETF. September 2009. IETF Best Current Practice. URL: [https://tools.ietf.org/html/bcp47](https://tools.ietf.org/html/bcp47)\[RFC2119\][Key words for use in RFCs to Indicate Requirement Levels](https://tools.ietf.org/html/rfc2119). S. Bradner. IETF. March 1997. Best Current Practice. URL: [https://tools.ietf.org/html/rfc2119](https://tools.ietf.org/html/rfc2119)\[RFC5988\][Web Linking](https://tools.ietf.org/html/rfc5988). M. Nottingham. IETF. October 2010. Proposed Standard. URL: [https://tools.ietf.org/html/rfc5988](https://tools.ietf.org/html/rfc5988)\[xmlschema11-2\][W3C XML Schema Definition Language (XSD) 1.1 Part 2: Datatypes](https://www.w3.org/TR/xmlschema11-2/). David Peterson; Sandy Gao; Ashok Malhotra; Michael Sperberg-McQueen; Henry Thompson; Paul V. Biron et al. W3C. 5 April 2012. W3C Recommendation. URL: [https://www.w3.org/TR/xmlschema11-2/](https://www.w3.org/TR/xmlschema11-2/)

### C.2 Informative references

\[HTML5\][HTML5](https://www.w3.org/TR/html5/). Ian Hickson; Robin Berjon; Steve Faulkner; Travis Leithead; Erika Doyle Navara; Theresa O'Connor; Silvia Pfeiffer. W3C. 28 October 2014. W3C Recommendation. URL: [https://www.w3.org/TR/html5/](https://www.w3.org/TR/html5/)

[↑](https://www.w3.org/TR/activitystreams-vocabulary/#toc)