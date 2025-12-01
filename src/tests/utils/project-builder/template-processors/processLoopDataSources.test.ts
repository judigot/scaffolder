import { describe, it, expect } from 'vitest';
import { processLoopDataSources } from '@/utils/project-builder/template-processors/processIterateCommand.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';

describe('processLoopDataSources', () => {
  const createTestUserFiles = (): IStructure => [
    {
      type: 'folder',
      name: 'DataSources',
      children: [
        {
          type: 'folder',
          name: 'People',
          children: [
            {
              type: 'folder',
              name: 'john-doe',
              children: [
                {
                  type: 'file',
                  name: 'info.yaml',
                  content: `basic-info:
  name: John Doe
  employee-id: EMP-001
  email: john.doe@example.com
employee:
  department: Engineering
  position: Senior Engineer`,
                },
              ],
            },
            {
              type: 'folder',
              name: 'jane-smith',
              children: [
                {
                  type: 'file',
                  name: 'info.yaml',
                  content: `basic-info:
  name: Jane Smith
  employee-id: EMP-002
  email: jane.smith@example.com
employee:
  department: Sales
  position: Sales Manager`,
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  it('should loop over data sources and generate content', () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const template = `<table>
[[LOOP_DATA_SOURCES(/DataSources/People/**/info.yaml --template="<tr><td>[[USE_DATA(basic-info.name)]]</td><td>[[USE_DATA(basic-info.employee-id)]]</td></tr>" --separator="\\n")]]
</table>`;

    const result = processLoopDataSources(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    expect(result).toContain('<table>');
    expect(result).toContain('</table>');
    expect(result).toContain('<tr><td>John Doe</td><td>EMP-001</td></tr>');
    expect(result).toContain('<tr><td>Jane Smith</td><td>EMP-002</td></tr>');
    expect(result).not.toContain('LOOP_DATA_SOURCES');
    expect(result).not.toContain('USE_DATA');
  });

  it('should handle nested data properties', () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const template = `[[LOOP_DATA_SOURCES(/DataSources/People/**/info.yaml --template="[[USE_DATA(employee.department)]]: [[USE_DATA(employee.position)]]" --separator=", ")]]`;

    const result = processLoopDataSources(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    expect(result).toContain('Engineering: Senior Engineer');
    expect(result).toContain('Sales: Sales Manager');
  });

  it('should return original content when no data sources match', () => {
    const userFiles: IStructure = [
      {
        type: 'folder',
        name: 'DataSources',
        children: [],
      },
    ];
    const schemaInfoParsed = getSchemaInfo([]);

    const template = `[[LOOP_DATA_SOURCES(/DataSources/NonExistent/**/info.yaml --template="[[USE_DATA(name)]]" --separator=", ")]]`;

    const result = processLoopDataSources(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    expect(result).toBe('');
  });

  it('should preserve content outside the LOOP_DATA_SOURCES tag', () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const template = `Header
[[LOOP_DATA_SOURCES(/DataSources/People/**/info.yaml --template="- [[USE_DATA(basic-info.name)]]" --separator="\\n")]]
Footer`;

    const result = processLoopDataSources(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    expect(result).toContain('Header');
    expect(result).toContain('Footer');
    expect(result).toContain('- John Doe');
    expect(result).toContain('- Jane Smith');
  });

  it('should handle templates with special characters', () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const template = `[[LOOP_DATA_SOURCES(/DataSources/People/**/info.yaml --template="<b>[[USE_DATA(basic-info.name)]]</b> - [[USE_DATA(basic-info.employee-id)]]" --separator=" | ")]]`;

    const result = processLoopDataSources(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    expect(result).toContain('<b>John Doe</b> - EMP-001');
    expect(result).toContain('<b>Jane Smith</b> - EMP-002');
    expect(result).toContain(' | ');
  });

  it('should aggregate all data sources into a single CSV output', () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const csvTemplate = `ID,Name,Email,Department,Position
[[LOOP_DATA_SOURCES(/DataSources/People/**/info.yaml --template="[[USE_DATA(basic-info.employee-id)]],[[USE_DATA(basic-info.name)]],[[USE_DATA(basic-info.email)]],[[USE_DATA(employee.department)]],[[USE_DATA(employee.position)]]" --separator="\\n")]]`;

    const result = processLoopDataSources(
      csvTemplate,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    // Verify CSV header is present
    expect(result).toContain('ID,Name,Email,Department,Position');

    // Verify both employees are in the single output
    expect(result).toContain(
      'EMP-001,John Doe,john.doe@example.com,Engineering,Senior Engineer',
    );
    expect(result).toContain(
      'EMP-002,Jane Smith,jane.smith@example.com,Sales,Sales Manager',
    );

    // Verify no template commands remain
    expect(result).not.toContain('LOOP_DATA_SOURCES');
    expect(result).not.toContain('USE_DATA');

    // Verify it's a single coherent output with newlines between rows
    const lines = result.split('\n');
    expect(lines).toHaveLength(3); // header + 2 employee rows
    expect(lines[0]).toBe('ID,Name,Email,Department,Position');
  });

  it('should handle HTML with escaped quotes in attributes (real-world scenario)', () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const htmlTemplate = `<tbody>
[[LOOP_DATA_SOURCES(/DataSources/People/**/info.yaml --template="      <tr>\\n        <td class=\\"employee-id\\">[[USE_DATA(basic-info.employee-id)]]</td>\\n        <td><strong>[[USE_DATA(basic-info.name)]]</strong></td>\\n        <td>[[USE_DATA(employee.position)]]</td>\\n        <td><span class=\\"department-badge\\">[[USE_DATA(employee.department)]]</span></td>\\n      </tr>" --separator="\\n")]]
    </tbody>`;

    const result = processLoopDataSources(
      htmlTemplate,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    // Verify the structure is intact
    expect(result).toContain('<tbody>');
    expect(result).toContain('</tbody>');

    // Verify escaped quotes were properly unescaped in HTML attributes
    expect(result).toContain('class="employee-id"');
    expect(result).toContain('class="department-badge"');
    expect(result).not.toContain('class=\\"employee-id\\"'); // Should not have escaped quotes

    // Verify data was properly inserted
    expect(result).toContain('<td class="employee-id">EMP-001</td>');
    expect(result).toContain('<td class="employee-id">EMP-002</td>');
    expect(result).toContain('<strong>John Doe</strong>');
    expect(result).toContain('<strong>Jane Smith</strong>');
    expect(result).toContain(
      '<span class="department-badge">Engineering</span>',
    );
    expect(result).toContain('<span class="department-badge">Sales</span>');

    // Verify both rows are present
    const rowMatches = result.match(/<tr>/g);
    expect(rowMatches).toHaveLength(2);

    // Verify no template commands remain
    expect(result).not.toContain('LOOP_DATA_SOURCES');
    expect(result).not.toContain('USE_DATA');
  });

  it('should handle complex escaped sequences in template strings', () => {
    const userFiles = createTestUserFiles();
    const schemaInfoParsed = getSchemaInfo([]);

    const complexTemplate = `[[LOOP_DATA_SOURCES(/DataSources/People/**/info.yaml --template="Name: [[USE_DATA(basic-info.name)]], Path: \\\\server\\\\share, Quote: \\"test\\"" --separator=" | ")]]`;

    const result = processLoopDataSources(
      complexTemplate,
      userFiles,
      schemaInfoParsed,
      undefined,
      null,
    );

    // Verify escaped backslashes are preserved (should be \\server\\share in output)
    expect(result).toContain('\\server\\share');

    // Verify escaped quotes are unescaped
    expect(result).toContain('"test"');
    expect(result).not.toContain('\\"test\\"');

    // Verify data is present
    expect(result).toContain('Name: John Doe');
    expect(result).toContain('Name: Jane Smith');
  });
});
