'use strict';
var conventionalChangelog = require('conventional-changelog');
var dateFormat = require('dateformat');
var Github = require('github');
var merge = require('lodash.merge');
var Q = require('q');
var through = require('through2');

var github = new Github({
  version: '3.0.0'
});

function conventionalGithubReleaser(auth, changelogOpts, context, gitRawCommitsOpts, parserOpts, writerOpts, userCb) {
  if (!auth) {
    throw new Error('Expected an auth object');
  }

  var promises = [];

  var changelogArgs = [changelogOpts, context, gitRawCommitsOpts, parserOpts, writerOpts].map(function(arg) {
    if (typeof arg === 'function') {
      userCb = arg;
      return {};
    } else {
      return arg || {};
    }
  });

  if (!userCb) {
    throw new Error('Expected an callback');
  }

  changelogOpts = changelogArgs[0];
  context = changelogArgs[1];
  gitRawCommitsOpts = changelogArgs[2];
  parserOpts = changelogArgs[3];
  writerOpts = changelogArgs[4];

  changelogOpts = merge({
    pkg: {
      path: 'package.json',
      transform: function(pkg) {
        if (pkg.version && pkg.version[0].toLowerCase() !== 'v') {
          pkg.version = 'v' + pkg.version;
        }

        return pkg;
      }
    },
    transform: through.obj(function(chunk, enc, cb) {
      if (typeof chunk.gitTags === 'string') {
        var match = /tag:\s*(.+?)[,\)]/gi.exec(chunk.gitTags);
        if (match) {
          chunk.version = match[1];
        }
      }

      if (chunk.committerDate) {
        chunk.committerDate = dateFormat(chunk.committerDate, 'yyyy-mm-dd', true);
      }

      cb(null, chunk);
    })
  }, changelogOpts);

  writerOpts.includeDetails = true;

  github.authenticate(auth);

  conventionalChangelog(changelogOpts, context, gitRawCommitsOpts, parserOpts, writerOpts)
    .on('error', function(err) {
      setImmediate(userCb, err);
    })
    .pipe(through.obj(function(chunk, enc, cb) {
      var version = (chunk.keyCommit && chunk.keyCommit.version) || context.version;

      if (!version) {
        setImmediate(userCb, new Error('Cannot find a version used for the release tag'));
        return;
      }

      var promise = Q.nfcall(github.releases.createRelease, {
        // jscs:disable
        owner: context.owner,
        repo: context.repository,
        tag_name: version,
        body: chunk.log
        // jscs:enable
      });

      promises.push(promise);

      cb();
    }, function() {
      Q.allSettled(promises)
        .then(function(responses) {
          setImmediate(userCb, null, responses);
        });
    }));
}

module.exports = conventionalGithubReleaser;
