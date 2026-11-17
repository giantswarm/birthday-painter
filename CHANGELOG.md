# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- added: First Birthday Painter prototype GitHub action according to the spec.
- changed: Switch image generation to the GA `gemini-3-pro-image` model, as the `gemini-3-pro-image-preview` model is deprecated and being shut down.
- added: Optional `DATE` input (`YYYY-MM-DD` or `MM-DD`) to the action and a `date` input to the `workflow_dispatch` trigger, to run for a specific calendar day instead of today.

[Unreleased]: https://github.com/giantswarm/birthday-painter/tree/main
