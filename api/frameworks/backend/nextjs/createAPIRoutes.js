import { APP_SETTINGS } from '../../../constants';
import { getPrimaryKey, changeCase } from '../../../utils/common';
import { createFile } from '../../../helpers/stringHelper';
const ROUTE_TEMPLATE = `
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
const GET_TEMPLATE = `
import { NextRequest, NextResponse } from 'next/server';
import DatatypeParser from '@/utils/DataTypeParser';
import { prisma } from '@/prisma/DatabaseClient';
import { {{tableName}} } from '@prisma/client';
import { {{className}} } from '@/app/Http/Controllers/{{className}}Controller';

type Response = {{tableName}};

const GetHandler = async (_req: NextRequest) => {
  try {
    const result: Response[] = await {{className}}.index();
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

export default GetHandler;
`;
const POST_TEMPLATE = `
import { NextRequest, NextResponse } from 'next/server';
import DatatypeParser from '@/utils/DataTypeParser';
import { prisma } from '@/prisma/DatabaseClient';
import { {{className}} } from '@/app/Http/Controllers/{{className}}Controller';
import { Prisma } from '@prisma/client';

type Body = Prisma.{{tableName}}CreateInput

const PostHandler = async (req: NextRequest) => {
  try {
    const body: Body = await req.json();
    const result = await {{className}}.store(body);
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

export default PostHandler;
`;
const PATCH_TEMPLATE = `
import { NextRequest, NextResponse } from 'next/server';
import DatatypeParser from '@/utils/DataTypeParser';
import { prisma } from '@/prisma/DatabaseClient';
import { {{tableName}} } from '@prisma/client';
import { {{className}} } from '@/app/Http/Controllers/{{className}}Controller';

type Body = Omit<{{tableName}}, '{{primaryKey}}'>

const PatchHandler = async (req: NextRequest) => {
  try {
    const body: Body = await req.json();
    const result = await {{className}}.patch(body);
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

export default PatchHandler;
`;
const DELETE_TEMPLATE = `
import { NextRequest, NextResponse } from 'next/server';
import DatatypeParser from '@/utils/DataTypeParser';
import { prisma } from '@/prisma/DatabaseClient';
import { {{tableName}} } from '@prisma/client';
import { {{className}} } from '@/app/Http/Controllers/{{className}}Controller';

type Body = Omit<{{tableName}}, '{{primaryKey}}'>

const DeletHandler = async (req: NextRequest) => {
  try {
    const body: Body = await req.json();
    const result = await {{className}}.destroy(body);
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

export default DeletHandler;
`;
const createAPIRoutes = (schemaInfo) => {
  return schemaInfo
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ({ isPivot }) => !(APP_SETTINGS.excludePivotTableFiles && isPivot),
    )
    .map((tableInfo) => {
      const { tableName } = tableInfo;
      const { plural, pascalCase } = changeCase(tableName);
      const className = pascalCase;
      const replacements = {
        tableName,
        className,
        primaryKey: getPrimaryKey({ tableName, schemaInfo }),
      };
      return {
        type: 'folder',
        name: plural,
        children: [
          {
            type: 'file',
            name: 'route.ts',
            content: createFile({ template: ROUTE_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: 'GET.ts',
            content: createFile({ template: GET_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: 'POST.ts',
            content: createFile({ template: POST_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: 'PATCH.ts',
            content: createFile({ template: PATCH_TEMPLATE, replacements }),
          },
          {
            type: 'file',
            name: 'DELETE.ts',
            content: createFile({ template: DELETE_TEMPLATE, replacements }),
          },
        ],
      };
    });
};
export default createAPIRoutes;
