aws_region     = "us-east-1"
environment    = "staging"
project_name   = "oracle-monitor"
vpc_cidr       = "10.1.0.0/16"

node_instance_types = ["t3.medium"]
node_desired_size   = 2
node_min_size       = 1
node_max_size       = 5

db_instance_class        = "db.t3.small"
db_allocated_storage     = 50
db_max_allocated_storage = 200

redis_node_type = "cache.t3.small"

domain_name = "staging.oracle-monitor.io"
