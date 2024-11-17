import { ISchemaInfo } from '@/interfaces/interfaces';
import { createFile } from '@/helpers/stringHelper';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { IStructure } from '@/components/FileViewer';

const TEMPLATE = `
{{ownerComment}}

import { NextRequest, NextResponse } from 'next/server';

{{useStatements}}

export async function GET(req: NextRequest) {
  // Fetch all {{pluralName}}
  return NextResponse.json({ message: 'GET {{pluralName}}' });
}

export async function POST(req: NextRequest) {
  // Create a new {{singularName}}
  return NextResponse.json({ message: 'POST {{singularName}}' });
}

export async function PATCH(req: NextRequest) {
  // Update an existing {{singularName}}
  return NextResponse.json({ message: 'PATCH {{singularName}}' });
}

export async function DELETE(req: NextRequest) {
  // Delete a {{singularName}}
  return NextResponse.json({ message: 'DELETE {{singularName}}' });
}
`;

const _createAPIRoutes = (schemaInfo: ISchemaInfo[]): IStructure => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const {
        tableCases: { plural, phraseCase, pascalCase },
      } = tableInfo;

      return {
        type: 'folder',
        name: plural,
        files: [
          {
            type: 'file',
            name: 'route.ts',
            content: createFile(TEMPLATE, {
              ownerComment,
              useStatements: `// Placeholder for imports related to ${pascalCase}`,
              pluralName: plural,
              singularName: phraseCase,
            }),
          },
          {
            type: 'file',
            name: 'GET.ts',
            content: createFile(
              `
{{ownerComment}}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Fetch all {{pluralName}}
  return NextResponse.json({ message: 'GET {{pluralName}}' });
}
              `,
              { ownerComment, pluralName: plural },
            ),
          },
          {
            type: 'file',
            name: 'POST.ts',
            content: createFile(
              `
{{ownerComment}}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Create a new {{singularName}}
  return NextResponse.json({ message: 'POST {{singularName}}' });
}
              `,
              { ownerComment, singularName: phraseCase },
            ),
          },
          {
            type: 'file',
            name: 'PATCH.ts',
            content: createFile(
              `
{{ownerComment}}

import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest) {
  // Update an existing {{singularName}}
  return NextResponse.json({ message: 'PATCH {{singularName}}' });
}
              `,
              { ownerComment, singularName: phraseCase },
            ),
          },
          {
            type: 'file',
            name: 'DELETE.ts',
            content: createFile(
              `
{{ownerComment}}

import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  // Delete a {{singularName}}
  return NextResponse.json({ message: 'DELETE {{singularName}}' });
}
              `,
              { ownerComment, singularName: phraseCase },
            ),
          },
        ],
      };
    });
};

export default _createAPIRoutes;
