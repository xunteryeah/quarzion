# Archived browser collector

This directory preserves the pre-2.0 browser automation implementation only
for migration history and audit review. It is not copied by the production
collector Dockerfile, is not part of the active test suite, and must not be
deployed to a Quarzion server.

The production collector lives in `collector/src` and uses official provider
APIs only.
