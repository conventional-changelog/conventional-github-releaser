#!/usr/bin/env node

'use strict'

const meow = require('meow')
const conventionalGitlabReleaser = require('./')

const cli = meow({
  help: `
    Usage
      conventional-gitlab-releaser

    Example
      conventional-gitlab-releaser -p angular

    Options
      -u,  --url                URL of your GitLab provider. Defaults to 'https://gitlab.com/api/v4/'
      -t, --token               Your GitLab auth token

      -p, --preset              Name of the preset you want to use. Must be one of the following:
                                angular, atom, codemirror, ember, eslint, express, jquery, jscs or jshint

      -k, --pkg                 A filepath of where your package.json is located
                                Default is the closest package.json from cwd

      -r, --release-count       How many releases to be generated from the latest
                                If 0, the whole changelog will be regenerated and the outfile will be overwritten
                                Default: 1

      -v, --verbose             Verbose output. Use this for debugging
                                Default: false

      -n, --config              A filepath of your config script
                                Example of a config script: https://github.com/conventional-changelog/conventional-changelog-angular/blob/master/index.js
                                This value is ignored if preset is specified

      -c, --context             A filepath of a javascript that is used to define template constntiables
  `,
  flags: {
    url: {
      alias: 'u',
      default: process.env.CONVENTIONAL_GITLAB_URL || 'https://gitlab.com/api/v4/',
      type: 'string'
    },
    token: {
      alias: 't',
      default: process.env.CONVENTIONAL_GITLAB_RELEASER_TOKEN || '',
      type: 'string'
    },
    preset: {
      alias: 'p',
      type: 'string'
    },
    pkg: {
      alias: 'k',
      type: 'string'
    },
    releaseCount: {
      alias: 'r',
      default: 1,
      type: 'number'
    },
    verbose: {
      alias: 'v',
      default: false,
      type: 'boolean'
    },
    config: {
      alias: 'n',
      type: 'string'
    },
    context: {
      alias: 'c',
      type: 'string'
    }
  }
})

const flags = cli.flags

let templateContext

try {
  if (flags.context) {
    templateContext = require(flags.context)
  }
} catch (err) {
  console.error('Failed to get file. ' + err)
  process.exit(1)
}

const changelogOpts = {
  preset: flags.preset,
  pkg: {
    path: flags.pkg
  },
  releaseCount: flags.releaseCount,
  config: flags.config
}

if (flags.verbose) {
  changelogOpts.debug = console.info.bind(console)
  changelogOpts.warn = console.warn.bind(console)
}

conventionalGitlabReleaser({
  url: flags.url,
  token: flags.token
}, changelogOpts, templateContext, function (err, data) {
  if (err) {
    console.error(err.toString())
    process.exit(1)
  }

  if (flags.verbose) {
    console.log(data)
  }
})
