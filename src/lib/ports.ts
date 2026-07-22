/**
 * Curated well-known and commonly seen TCP/UDP ports. Hand-maintained; the
 * point is the ports engineers actually meet, not the full IANA registry.
 */

export interface PortEntry {
  port: number;
  proto: 'TCP' | 'UDP' | 'TCP/UDP';
  service: string;
  note: string;
}

export const PORTS: PortEntry[] = [
  { port: 20, proto: 'TCP', service: 'FTP data', note: 'Active-mode data channel' },
  { port: 21, proto: 'TCP', service: 'FTP control', note: 'Legacy file transfer; prefer SFTP' },
  { port: 22, proto: 'TCP', service: 'SSH / SFTP / SCP', note: 'Secure shell and file transfer' },
  { port: 23, proto: 'TCP', service: 'Telnet', note: 'Unencrypted; should not be exposed' },
  { port: 25, proto: 'TCP', service: 'SMTP', note: 'Server-to-server mail; often blocked outbound' },
  { port: 53, proto: 'TCP/UDP', service: 'DNS', note: 'UDP for queries, TCP for zone transfers and large answers' },
  { port: 67, proto: 'UDP', service: 'DHCP server', note: 'Address assignment' },
  { port: 68, proto: 'UDP', service: 'DHCP client', note: 'Address assignment' },
  { port: 69, proto: 'UDP', service: 'TFTP', note: 'Trivial file transfer; PXE boot' },
  { port: 80, proto: 'TCP', service: 'HTTP', note: 'Unencrypted web; usually redirects to 443' },
  { port: 88, proto: 'TCP/UDP', service: 'Kerberos', note: 'Authentication in Active Directory' },
  { port: 110, proto: 'TCP', service: 'POP3', note: 'Legacy mail retrieval' },
  { port: 123, proto: 'UDP', service: 'NTP', note: 'Clock synchronisation' },
  { port: 135, proto: 'TCP', service: 'MS RPC', note: 'Windows RPC endpoint mapper' },
  { port: 137, proto: 'UDP', service: 'NetBIOS name', note: 'Legacy Windows naming' },
  { port: 139, proto: 'TCP', service: 'NetBIOS session', note: 'Legacy SMB transport' },
  { port: 143, proto: 'TCP', service: 'IMAP', note: 'Mail retrieval; STARTTLS' },
  { port: 161, proto: 'UDP', service: 'SNMP', note: 'Device monitoring' },
  { port: 162, proto: 'UDP', service: 'SNMP trap', note: 'Device alerts' },
  { port: 179, proto: 'TCP', service: 'BGP', note: 'Internet routing between peers' },
  { port: 389, proto: 'TCP/UDP', service: 'LDAP', note: 'Directory lookups; STARTTLS' },
  { port: 443, proto: 'TCP', service: 'HTTPS', note: 'TLS web traffic; HTTP/3 uses UDP 443 (QUIC)' },
  { port: 445, proto: 'TCP', service: 'SMB', note: 'Windows file sharing; never expose to the internet' },
  { port: 465, proto: 'TCP', service: 'SMTPS', note: 'Mail submission over implicit TLS' },
  { port: 500, proto: 'UDP', service: 'IKE', note: 'IPsec key exchange' },
  { port: 514, proto: 'UDP', service: 'Syslog', note: 'Legacy log shipping; 6514 for TLS' },
  { port: 587, proto: 'TCP', service: 'SMTP submission', note: 'Authenticated mail sending' },
  { port: 636, proto: 'TCP', service: 'LDAPS', note: 'LDAP over TLS' },
  { port: 853, proto: 'TCP/UDP', service: 'DNS over TLS', note: 'Encrypted DNS' },
  { port: 873, proto: 'TCP', service: 'rsync', note: 'File synchronisation daemon' },
  { port: 993, proto: 'TCP', service: 'IMAPS', note: 'IMAP over TLS' },
  { port: 995, proto: 'TCP', service: 'POP3S', note: 'POP3 over TLS' },
  { port: 1080, proto: 'TCP', service: 'SOCKS', note: 'Proxy protocol' },
  { port: 1194, proto: 'UDP', service: 'OpenVPN', note: 'VPN; TCP fallback common' },
  { port: 1433, proto: 'TCP', service: 'SQL Server', note: 'Microsoft SQL Server' },
  { port: 1521, proto: 'TCP', service: 'Oracle DB', note: 'Oracle listener' },
  { port: 1883, proto: 'TCP', service: 'MQTT', note: 'IoT messaging; 8883 for TLS' },
  { port: 2049, proto: 'TCP/UDP', service: 'NFS', note: 'Network file system' },
  { port: 2181, proto: 'TCP', service: 'ZooKeeper', note: 'Coordination service client port' },
  { port: 2375, proto: 'TCP', service: 'Docker API', note: 'Unencrypted; 2376 for TLS. Never expose 2375' },
  { port: 2379, proto: 'TCP', service: 'etcd client', note: 'Kubernetes state store; 2380 for peers' },
  { port: 3000, proto: 'TCP', service: 'Dev servers / Grafana', note: 'Common default for web apps and Grafana' },
  { port: 3128, proto: 'TCP', service: 'Squid proxy', note: 'HTTP proxy default' },
  { port: 3306, proto: 'TCP', service: 'MySQL / MariaDB', note: 'Database' },
  { port: 3389, proto: 'TCP', service: 'RDP', note: 'Windows remote desktop; do not expose unprotected' },
  { port: 3478, proto: 'UDP', service: 'STUN / TURN', note: 'NAT traversal for WebRTC and VoIP' },
  { port: 4369, proto: 'TCP', service: 'EPMD', note: 'Erlang port mapper (RabbitMQ clustering)' },
  { port: 4500, proto: 'UDP', service: 'IPsec NAT-T', note: 'IPsec through NAT' },
  { port: 5044, proto: 'TCP', service: 'Beats / Logstash', note: 'Elastic log shipping' },
  { port: 5060, proto: 'TCP/UDP', service: 'SIP', note: 'VoIP signalling; 5061 for TLS' },
  { port: 5222, proto: 'TCP', service: 'XMPP', note: 'Messaging client connections' },
  { port: 5432, proto: 'TCP', service: 'PostgreSQL', note: 'Database' },
  { port: 5671, proto: 'TCP', service: 'AMQP over TLS', note: 'RabbitMQ; 5672 plaintext' },
  { port: 5672, proto: 'TCP', service: 'AMQP', note: 'RabbitMQ default' },
  { port: 5900, proto: 'TCP', service: 'VNC', note: 'Remote desktop; display 0' },
  { port: 5984, proto: 'TCP', service: 'CouchDB', note: 'Database HTTP API' },
  { port: 6379, proto: 'TCP', service: 'Redis', note: 'In-memory store; bind privately' },
  { port: 6443, proto: 'TCP', service: 'Kubernetes API', note: 'kube-apiserver' },
  { port: 6514, proto: 'TCP', service: 'Syslog over TLS', note: 'Encrypted log shipping' },
  { port: 7000, proto: 'TCP', service: 'Cassandra inter-node', note: '7001 for TLS' },
  { port: 8000, proto: 'TCP', service: 'Dev HTTP', note: 'Common development server default' },
  { port: 8080, proto: 'TCP', service: 'HTTP alternate', note: 'Proxies, Tomcat, dev servers' },
  { port: 8443, proto: 'TCP', service: 'HTTPS alternate', note: 'TLS on a non-standard port' },
  { port: 8500, proto: 'TCP', service: 'Consul', note: 'HTTP API and UI' },
  { port: 8600, proto: 'TCP/UDP', service: 'Consul DNS', note: 'Service discovery DNS' },
  { port: 8883, proto: 'TCP', service: 'MQTT over TLS', note: 'Secure IoT messaging' },
  { port: 9000, proto: 'TCP', service: 'MinIO / SonarQube / PHP-FPM', note: 'Crowded default; check the host' },
  { port: 9042, proto: 'TCP', service: 'Cassandra CQL', note: 'Client protocol' },
  { port: 9090, proto: 'TCP', service: 'Prometheus', note: 'Server and UI' },
  { port: 9092, proto: 'TCP', service: 'Kafka', note: 'Broker client port' },
  { port: 9093, proto: 'TCP', service: 'Alertmanager', note: 'Prometheus alert routing' },
  { port: 9100, proto: 'TCP', service: 'node_exporter', note: 'Host metrics for Prometheus' },
  { port: 9200, proto: 'TCP', service: 'Elasticsearch / OpenSearch', note: 'HTTP API; 9300 for transport' },
  { port: 9418, proto: 'TCP', service: 'Git', note: 'git:// protocol' },
  { port: 10250, proto: 'TCP', service: 'kubelet API', note: 'Node agent; keep off the internet' },
  { port: 11211, proto: 'TCP/UDP', service: 'Memcached', note: 'Cache; UDP exposure enables amplification abuse' },
  { port: 15672, proto: 'TCP', service: 'RabbitMQ management', note: 'Web UI' },
  { port: 27017, proto: 'TCP', service: 'MongoDB', note: 'Database' },
];

/** Filter by port number, service name, or note text. */
export function searchPorts(query: string): PortEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return PORTS;
  const asNumber = /^\d+$/.test(q) ? Number(q) : null;
  return PORTS.filter(
    (p) =>
      (asNumber !== null && String(p.port).startsWith(q)) ||
      p.service.toLowerCase().includes(q) ||
      p.note.toLowerCase().includes(q) ||
      p.proto.toLowerCase() === q,
  );
}
