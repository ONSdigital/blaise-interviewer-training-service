service: bits-ui
runtime: nodejs24

vpc_access_connector:
  name: _VPC_CONNECTOR

env_variables:
  BLAISE_API_URL: _BLAISE_API_URL
  PROJECT_ID: _PROJECT_ID
  SERVER_PARK: _SERVER_PARK
  SURVEYS_TO_SHOW: _SURVEYS_TO_SHOW
  VM_EXTERNAL_WEB_URL: _VM_EXTERNAL_WEB_URL

automatic_scaling:
  min_instances: _MIN_INSTANCES
  max_instances: _MAX_INSTANCES
  target_cpu_utilization: _TARGET_CPU_UTILIZATION

handlers:
- url: /.*
  script: auto
  secure: always
  redirect_http_response_code: 301
