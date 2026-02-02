aws_region     = "us-east-1"
environment    = "production"
project_name   = "oracle-monitor"
vpc_cidr       = "10.0.0.0/16"

node_instance_types = ["m6i.large", "m6i.xlarge"]
node_desired_size   = 3
node_min_size       = 2
node_max_size       = 10

db_instance_class        = "db.r6g.large"
db_allocated_storage     = 100
db_max_allocated_storage = 500

redis_node_type = "cache.r6g.large"

domain_name = "oracle-monitor.io"
