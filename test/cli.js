'use strict';
var expect = require('chai').expect;
var fs = require('fs');
var githubRemoveAllReleases = require('github-remove-all-releases');
var shell = require('shelljs');
var spawn = require('child_process').spawn;
var concat = require('concat-stream');

var cliPath = __dirname + '/../cli.js';
var repo = require('./fixtures').repo
var AUTH = require('./fixtures').auth

describe('cli', function() {
  before(function(done) {
    shell.cd('cli');
    shell.exec('git init');
    fs.writeFileSync('test1', '');
    shell.exec('git add --all && git commit -m"First commit"');
    shell.exec('git tag v0.0.1');

    githubRemoveAllReleases(AUTH, repo.owner, repo.name, function () {
      done()
    });
  });

  after(function() {
    shell.cd('../');
  });

  it('should work with one release', function(done) {
    var cp = spawn(cliPath, ['--pkg',  __dirname + '/fixtures/_package.json', '-t', AUTH.token, '-v'], {
      stdio: [process.stdin, null, null]
    });

    cp.stdout.pipe(concat(function(data) {
      expect(data.toString()).to.include('Your git-log command is:');
      expect(data.toString()).to.include('state: \'fulfilled\'');
    }));

    cp.on('close', function(code) {
      expect(code).to.equal(0);

      done();
    });
  });

  it('should print out error message and exit with `1` if all results error', function(done) {
    var cp = spawn(cliPath, ['--pkg',  __dirname + '/fixtures/_package.json', '-t', AUTH.token], {
      stdio: [process.stdin, null, null]
    });

    cp.stderr.pipe(concat(function(data) {
      expect(data.toString()).to.include('already_exists');
    }));

    cp.on('close', function(code) {
      expect(code).to.equal(1);

      done();
    });
  });

  it('should print out error message and exit with `1` if all results error when verbose', function(done) {
    var cp = spawn(cliPath, ['--pkg',  repo.pkg.path, '-t', AUTH.token, '-v'], {
      stdio: [process.stdin, null, null]
    });

    cp.stderr.pipe(concat(function(data) {
      expect(data.toString()).to.include('already_exists');
    }));

    cp.on('close', function(code) {
      expect(code).to.equal(1);

      done();
    });
  });

  it('should exit with `0` if not all results error', function(done) {
    fs.writeFileSync('test2', '');
    shell.exec('git add --all && git commit -m"Second commit"');
    shell.exec('git tag v0.0.2');

    var cp = spawn(cliPath, ['--pkg',  repo.pkg.path, '-t', AUTH.token, '-r', '0'], {
      stdio: [process.stdin, null, null]
    });

    cp.on('close', function(code) {
      expect(code).to.equal(0);

      done();
    });
  });

  it('should exit with `1` if all results error', function(done) {
    var cp = spawn(cliPath, ['--pkg',  repo.pkg.path, '-t', AUTH.token, '-r', '0'], {
      stdio: [process.stdin, null, null]
    });

    cp.stderr.pipe(concat(function(data) {
      expect(data.toString()).to.include('already_exists');
    }));

    cp.on('close', function(code) {
      expect(code).to.equal(1);

      done();
    });
  });

});
