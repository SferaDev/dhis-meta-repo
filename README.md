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

## Build executable

```
$ yarn dist
```

This will produce a bundled executable ```dhis-meta-repo.js``` file that can be executed with ```node```.

## Configuration file

File `config.json` must be provided, the path of the configuration file can be changed with argument ``-c`` or ``--config``.

All the properties have a default value in case the configuration file is not complete.
