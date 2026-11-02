export type StarterRequirement = {
  code: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
};

export type SecurityFrameworkDefinition = {
  key: string;
  name: string;
  version: string;
  description: string;
  requirements: StarterRequirement[];
};

export const SECURITY_FRAMEWORK_CATALOG: SecurityFrameworkDefinition[] = [
  {
    key: 'soc2',
    name: 'SOC 2',
    version: '2022',
    description:
      'A starter control-tracking foundation organized around the SOC 2 Trust Services Criteria.',
    requirements: [
      {
        code: 'CC1.1',
        title: 'Demonstrate commitment to integrity and ethical values',
        description: 'Document expected ethical conduct and communicate it to personnel.',
        category: 'Control environment',
        priority: 'high',
      },
      {
        code: 'CC1.2',
        title: 'Establish oversight responsibilities',
        description: 'Define management and governance oversight for internal controls.',
        category: 'Control environment',
        priority: 'high',
      },
      {
        code: 'CC2.1',
        title: 'Communicate relevant information internally',
        description: 'Provide personnel with information needed to carry out control responsibilities.',
        category: 'Communication',
        priority: 'medium',
      },
      {
        code: 'CC3.2',
        title: 'Assess risks to business objectives',
        description: 'Identify and assess risks that could prevent the organization from meeting its objectives.',
        category: 'Risk assessment',
        priority: 'high',
      },
      {
        code: 'CC6.1',
        title: 'Restrict logical access',
        description: 'Use access controls to restrict access to systems and information to authorized users.',
        category: 'Logical access',
        priority: 'critical',
      },
      {
        code: 'CC7.2',
        title: 'Monitor systems for security events',
        description: 'Monitor system components and investigate potential security events.',
        category: 'System operations',
        priority: 'high',
      },
    ],
  },
  {
    key: 'iso27001',
    name: 'ISO/IEC 27001',
    version: '2022',
    description:
      'A starter information security management tracking foundation aligned to the 2022 edition.',
    requirements: [
      {
        code: '4.1',
        title: 'Understand the organization and its context',
        description: 'Identify internal and external issues relevant to the information security management system.',
        category: 'Context',
        priority: 'high',
      },
      {
        code: '4.2',
        title: 'Understand interested parties and their needs',
        description: 'Identify relevant interested parties and their information security requirements.',
        category: 'Context',
        priority: 'medium',
      },
      {
        code: '5.2',
        title: 'Establish an information security policy',
        description: 'Define, approve, communicate, and maintain an information security policy.',
        category: 'Leadership',
        priority: 'high',
      },
      {
        code: '6.1',
        title: 'Address information security risks',
        description: 'Define and apply a process for assessing and treating information security risks.',
        category: 'Risk management',
        priority: 'critical',
      },
      {
        code: '7.2',
        title: 'Ensure personnel competence',
        description: 'Determine necessary security-related competence and retain evidence of it.',
        category: 'People',
        priority: 'medium',
      },
      {
        code: '9.1',
        title: 'Monitor and evaluate security performance',
        description: 'Determine what security performance is monitored, measured, analyzed, and evaluated.',
        category: 'Performance evaluation',
        priority: 'high',
      },
    ],
  },
  {
    key: 'nist-csf',
    name: 'NIST Cybersecurity Framework',
    version: '2.0',
    description:
      'A starter cybersecurity risk-management foundation organized around the six CSF 2.0 functions.',
    requirements: [
      {
        code: 'GV.OC',
        title: 'Understand organizational context',
        description: 'Identify the mission, stakeholders, dependencies, and context that shape cybersecurity risk decisions.',
        category: 'Govern',
        priority: 'high',
      },
      {
        code: 'GV.RM',
        title: 'Establish risk management strategy',
        description: 'Define and communicate the organization’s cybersecurity risk management priorities and appetite.',
        category: 'Govern',
        priority: 'critical',
      },
      {
        code: 'ID.AM',
        title: 'Manage organizational assets',
        description: 'Maintain an inventory and understanding of hardware, software, services, data, and other assets.',
        category: 'Identify',
        priority: 'high',
      },
      {
        code: 'PR.AA',
        title: 'Manage identity and access',
        description: 'Manage identities, authentication, and access permissions for authorized users and services.',
        category: 'Protect',
        priority: 'critical',
      },
      {
        code: 'DE.CM',
        title: 'Monitor for cybersecurity events',
        description: 'Monitor assets and activities to identify potentially adverse cybersecurity events.',
        category: 'Detect',
        priority: 'high',
      },
      {
        code: 'RS.MA',
        title: 'Manage incident response',
        description: 'Execute and coordinate incident response activities according to established procedures.',
        category: 'Respond',
        priority: 'high',
      },
    ],
  },
];
