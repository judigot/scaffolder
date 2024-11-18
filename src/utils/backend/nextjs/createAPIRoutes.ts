import { ISchemaInfo } from '@/interfaces/interfaces';
import { createFile } from '@/helpers/stringHelper';
import { APP_SETTINGS, ownerComment } from '@/constants';
import { IStructure } from '@/components/FileViewer';

const ROUTE_TEMPLATE = `
{{ownerComment}}

import GetHandler from './GET';
import PostHandler from './POST';
import PatchHandler from './PATCH';
import DeleteHandler from './DELETE';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  return GetHandler(req);
}

export async function POST(req: NextRequest) {
  return PostHandler(req);
}

export async function PATCH(req: NextRequest) {
  return PatchHandler(req);
}

export async function DELETE(req: NextRequest) {
  return DeleteHandler(req);
}
`;

const HANDLER_TEMPLATE = `
{{ownerComment}}

import { NextRequest, NextResponse } from 'next/server';
import { {{tableName}} } from '@prisma/client';
import DatatypeParser from '@/utils/DataTypeParser';
import { prisma } from '@/prisma/DatabaseClient';

interface Response extends {{tableName}} {}

const {{handlerName}} = async (req: NextRequest) => {
  try {
    const result: Response[] = await prisma.{{tableName}}.{{operation}}();
    return NextResponse.json(DatatypeParser(result));
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      error: error,
    });
  } finally {
    await prisma.$disconnect();
  }
};

export default {{handlerName}};
`;

const createAPIRoutes = (schemaInfo: ISchemaInfo[]): IStructure => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot), // Exclude pivot tables if specified in APP_SETTINGS
    )
    .map((tableInfo) => {
      const {
        table,
        tableCases: { plural },
      } = tableInfo;

      return {
        type: 'folder',
        name: plural,
        files: [
          {
            type: 'file',
            name: 'route.ts',
            content: createFile(ROUTE_TEMPLATE, {
              ownerComment,
            }),
          },
          {
            type: 'file',
            name: 'GET.ts',
            content: createFile(HANDLER_TEMPLATE, {
              ownerComment,
              tableName: table,
              handlerName: 'GetHandler',
              operation: 'findMany',
            }),
          },
          {
            type: 'file',
            name: 'POST.ts',
            content: createFile(HANDLER_TEMPLATE, {
              ownerComment,
              tableName: table,
              handlerName: 'PostHandler',
              operation: 'create',
            }),
          },
          {
            type: 'file',
            name: 'PATCH.ts',
            content: createFile(HANDLER_TEMPLATE, {
              ownerComment,
              tableName: table,
              handlerName: 'PatchHandler',
              operation: 'update',
            }),
          },
          {
            type: 'file',
            name: 'DELETE.ts',
            content: createFile(HANDLER_TEMPLATE, {
              ownerComment,
              tableName: table,
              handlerName: 'DeleteHandler',
              operation: 'delete',
            }),
          },
        ],
      };
    });
};

export default createAPIRoutes;
