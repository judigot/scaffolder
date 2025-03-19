import React from 'react';
import ReactDOM from 'react-dom/client';

import '@/styles/scss/main.scss';
import App from '@/App.tsx';
import SQLSchemaInputModal from '@/components/SQLSchemaInputModal.tsx';
// import TransformationTester from '@/TransformationTester.tsx';
import ModalProvider from '@/components/Modal/base/ModalProvider.tsx';

// import { FormParser } from '@/dynamic-form/ReactFormParser.tsx';
// import { JSONFormStructure } from '@/dynamic-form/DynamicFormStructure.ts';import { parse, stringify } from 'yaml'

import formatCode from '@/utils/formatCode.ts';

void (async () => {
  const formattedCode = await formatCode(`<?php

namespace App\\Models;

use App\\Models\\User;
use Illuminate\\Database\\Eloquent\\Model;
use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;

class Profile extends Model
{
    use HasFactory;

    protected $table = 'profile';

    protected $primaryKey = 'profile_id';

    protected $hidden = [
        
    ];

    protected $fillable = [
        'user_id',
        'bio'
    ];

    

    

    

    public function user() {
        return $this->belongsTo(User::class);
    }

}`).php;
  // eslint-disable-next-line no-console
  console.log(formattedCode);
})();



const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* <FormParser structure={JSONFormStructure} /> */}

      <ModalProvider />
      <SQLSchemaInputModal />
      {/* <TransformationTester /> */}
      <App />
    </React.StrictMode>,
  );
}
