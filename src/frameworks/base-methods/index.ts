import batchUpdate from './batchUpdate/laravel.ts';
import chunk from './chunk/laravel.ts';
import count from './count/laravel.ts';
import create from './create/laravel.ts';
import destroy from './destroy/laravel.ts';
import each from './each/laravel.ts';
import exists from './exists/laravel.ts';
import findByAttributes from './findByAttributes/laravel.ts';
import findById from './findById/laravel.ts';
import findMany from './findMany/laravel.ts';
import findOrFail from './findOrFail/laravel.ts';
import firstOrCreate from './firstOrCreate/laravel.ts';
import firstOrNew from './firstOrNew/laravel.ts';
import getWithRelations from './getWithRelations/laravel.ts';
import groupBy from './groupBy/laravel.ts';
import index from './index/laravel.ts';
import latest from './latest/laravel.ts';
import oldest from './oldest/laravel.ts';
import onlyTrashed from './onlyTrashed/laravel.ts';
import orderBy from './orderBy/laravel.ts';
import paginate from './paginate/laravel.ts';
import pluck from './pluck/laravel.ts';
import random from './random/laravel.ts';
import restore from './restore/laravel.ts';
import search from './search/laravel.ts';
import softDelete from './softDelete/laravel.ts';
import update from './update/laravel.ts';
import updateOrCreate from './updateOrCreate/laravel.ts';
import whereBetween from './whereBetween/laravel.ts';
import whereIn from './whereIn/laravel.ts';
import whereNotIn from './whereNotIn/laravel.ts';
import withoutTrashed from './withoutTrashed/laravel.ts';
import withTrashed from './withTrashed/laravel.ts';

export const loadFeatureMethods = (frameworkName: string) => {
  if (frameworkName !== 'laravel') {
    return;
  }

  return {
    laravel: {
      batchUpdate,
      chunk,
      count,
      create,
      destroy,
      each,
      exists,
      findByAttributes,
      findById,
      findMany,
      findOrFail,
      firstOrCreate,
      firstOrNew,
      getWithRelations,
      groupBy,
      index,
      latest,
      oldest,
      onlyTrashed,
      orderBy,
      paginate,
      pluck,
      random,
      restore,
      search,
      softDelete,
      update,
      updateOrCreate,
      whereBetween,
      whereIn,
      whereNotIn,
      withoutTrashed,
      withTrashed,
    },
  };
};
