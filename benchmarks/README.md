# Compatibility fixtures

This directory contains small, reviewable shell fixtures used to protect the
meaning of InstallReady's static results. They are deliberately synthetic:
they are not a claim about real-world precision or recall.

Each fixture has an entry in `manifest.json` with the expected status for the
four supported target images. The test suite runs the current analyzer against
every entry, so a rule change must make its evidence and status changes
explicit.

The next benchmark milestone is a manually labelled set of public repositories
with pinned commits and recorded runtime results. Until that set exists, the
project does not publish accuracy percentages.
