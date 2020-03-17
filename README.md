# DHIS2 Metadata git repository builder

A simple script that creates/updates an opinionated git repository with all the metadata found in a given DHIS2 instance.

Since DHIS2 does not support metadata versioning, it's impossible to track down changes.

This script supports incremental changes as git commits authored by a DHIS2 user on the day the last change was introduced.

The changes are queried using the ``/metadata`` endpoint using ``d2-api``.

## Setup

```
$ yarn install
```

## Development

```
$ yarn start
```

## Configuration file

File `config.json` must be provided, the path of the configuration file can be changed with argument ``-c`` or ``--config``.

All the properties have a default value in case the configuration file is not complete.

```
{
    "debug": true,
    "dhis": {
        "baseUrl": "http://play.dhis2.org/demo",
        "username": "admin",
        "password": "district"
    },
    "repo": {
        "url": "git@github.com:<user>/<repo>.git",
        "branch": "branch",
        "ssh": {
            "publicKey": "/home/<user>/.ssh/id_rsa.pub",
            "privateKey": "/home/<user>/.ssh/id_rsa",
            "passphrase": ""
        },
        "commiter": {
            "name": "DHIS Meta Repo",
            "email": "meta-repo@dhis"
        },
        "temporal": true,
        "hideAuthor": false,
        "pushToRemote": true
    },
    "logger": {
        "level": "trace",
        "fileName": "debug.log"
    },
    "metadata": {
        "exclusions": ["externalFileResources", "eventFilters"],
        "special": ["organisationUnits"]
    }
}
```