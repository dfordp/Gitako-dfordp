RAW_VERSION?=$(shell node scripts/get-version.js)
FULL_VERSION=v$(RAW_VERSION)

pull-icons:
	git clone https://github.com/vscode-icons/vscode-icons.git vscode-icons --depth=1

update-icons:
	cd vscode-icons && git pull
	node scripts/resolve-languages-map
	node scripts/generate-icon-index

version-safari:
	sed -i '' -E 's/MARKETING_VERSION = .*;/MARKETING_VERSION = $(RAW_VERSION);/' Safari/Gitako/Gitako.xcodeproj/project.pbxproj

clean:
	rm -rf dist

build:
	yarn build

test:
	yarn test

upload-for-analytics:
	# make sure sentry can retrieve current commit on remote, push both branch and tag
	git push
	git push --tags
	yarn sentry-cli releases new "$(FULL_VERSION)"
	yarn sentry-cli releases set-commits "$(FULL_VERSION)" --auto
	yarn sentry-cli releases files "$(FULL_VERSION)" upload-sourcemaps dist --no-rewrite
	yarn sentry-cli releases finalize "$(FULL_VERSION)"

compress:
	cd dist && zip -r Gitako-$(FULL_VERSION).zip * -x *.map -x *.DS_Store -x*.zip

patch-firefox-manifest:
	node scripts/patch-manifest-for-firefox.js

compress-firefox:
	cd dist && zip -r Gitako-$(FULL_VERSION)-firefox.zip * -x *.map -x *.DS_Store -x*.zip

compress-source:
	git archive -o dist/Gitako-$(FULL_VERSION)-source.zip HEAD
	zip dist/Gitako-$(FULL_VERSION)-source.zip .env
	zip -r dist/Gitako-$(FULL_VERSION)-source.zip vscode-icons/icons

copy-build-safari:
	rm -rf Safari/Gitako/Gitako\ Extension/Resources/*
	cd dist && cp -r . ../Safari/Gitako/Gitako\ Extension/Resources

release:
	$(MAKE) clean
	$(MAKE) build
	$(MAKE) test
	$(MAKE) upload-for-analytics
	$(MAKE) compress
	$(MAKE) patch-firefox-manifest
	$(MAKE) compress-firefox
	$(MAKE) compress-source
	$(MAKE) copy-build-safari

release-dry-run:
	$(MAKE) clean
	$(MAKE) build
	$(MAKE) test
	$(MAKE) compress
	$(MAKE) patch-firefox-manifest
	$(MAKE) compress-firefox
	$(MAKE) compress-source
	$(MAKE) copy-build-safari
