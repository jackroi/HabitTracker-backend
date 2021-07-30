#!/usr/bin/env sh

# Generate API documentation in html format

# Classic theme
docker run -v $(pwd):/tmp \
           -t \
           aglio -i /tmp/docs/habit-tracker-api.apib \
                 -o /tmp/docs/output.html \
& \

# Dark triple column theme
docker run -v $(pwd):/tmp \
           -t \
           aglio --theme-variables slate \
                 --theme-template triple \
                 -i /tmp/docs/habit-tracker-api.apib \
                 -o /tmp/docs/output-slate.html \
