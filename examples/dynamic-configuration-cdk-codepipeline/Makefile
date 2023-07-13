NPM = npm
CDK = npx cdk

stack ?=
feature ?=

ifdef stack
	ifdef feature
		stack_name = ${stack}-${feature}
	else
		stack_name = ${stack}
	endif
else
	stack_name=--all
endif
ifdef feature
	cdk_args = -c feature=${feature}
endif

install:
	$(NPM) install

bootstrap:
	./scripts/bootstrap.ts

test:
	$(NPM) run test

list:
	$(CDK) list $(stack_name) ${cdk_args}

synth:
	$(CDK) synth $(stack_name) ${cdk_args}

diff:
	$(CDK) diff $(stack_name) ${cdk_args}

deploy:
	$(CDK) deploy $(stack_name) ${cdk_args} --no-rollback

deploy_rollback:
	$(CDK) deploy $(stack_name) ${cdk_args}

destroy:
	$(CDK) destroy $(stack_name) ${cdk_args}

clean:
	rm -rf node_modules

.PHONY: install bootstrap test list synth deploy deploy_rollback destroy clean