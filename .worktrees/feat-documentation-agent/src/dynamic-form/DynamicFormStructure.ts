export const JSONFormStructure =
  // {
  //   title: 'Enterprise Registration Form',
  //   description: 'A dynamic, multi-step registration form for various use cases.',
  //   type: 'object',
  //   global: {
  //     theme: 'corporate',
  //     defaultErrorMessages: {
  //       required: 'This field is required',
  //       pattern: 'Invalid format',
  //     },
  //     defaultColumns: 2,
  //     defaultButtonStyles: {
  //       backgroundColor: '#4CAF50',
  //       color: '#fff',
  //     },
  //   },
  //   steps: [
  //     {
  //       title: 'Step 1: Basic Information',
  //       description: 'Enter your personal and contact information.',
  //       sections: [
  //         {
  //           title: 'Personal Details',
  //           description: 'Please provide your personal details.',
  //           columns: 2,
  //           required: ['firstName', 'lastName', 'email'],
  //           fields: [
  //             {
  //               key: 'firstName',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'First Name',
  //               placeholder: 'Enter your first name',
  //             },
  //             {
  //               key: 'lastName',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Last Name',
  //             },
  //             {
  //               key: 'email',
  //               type: 'string',
  //               widget: 'email',
  //               label: 'Email Address',
  //               pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
  //               errorMessages: {
  //                 pattern: 'Please enter a valid email address.',
  //               },
  //             },
  //             {
  //               key: 'phoneNumber',
  //               type: 'string',
  //               widget: 'tel',
  //               label: 'Phone Number',
  //               placeholder: 'Enter your phone number',
  //               minLength: 10,
  //               maxLength: 15,
  //             },
  //             {
  //               key: 'age',
  //               type: 'integer',
  //               widget: 'number',
  //               label: 'Age',
  //               min: 18,
  //               max: 100,
  //               computed: {
  //                 dependsOn: ['dateOfBirth'],
  //                 formula: 'currentYear - new Date(dateOfBirth).getFullYear()',
  //               },
  //             },
  //             {
  //               key: 'gender',
  //               type: 'string',
  //               widget: 'radio',
  //               label: 'Gender',
  //               enum: ['Male', 'Female', 'Other'],
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //     {
  //       title: 'Step 2: Address Information',
  //       description: 'Enter your current and previous addresses.',
  //       sections: [
  //         {
  //           title: 'Primary Address',
  //           description: 'Provide your current address.',
  //           columns: 1,
  //           required: ['addressLine1', 'city', 'state', 'zipCode'],
  //           fields: [
  //             {
  //               key: 'addressLine1',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Address Line 1',
  //             },
  //             {
  //               key: 'addressLine2',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Address Line 2 (Optional)',
  //             },
  //             {
  //               key: 'city',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'City',
  //             },
  //             {
  //               key: 'state',
  //               type: 'string',
  //               widget: 'select',
  //               label: 'State',
  //               enum: ['CA', 'NY', 'TX', 'WA'],
  //             },
  //             {
  //               key: 'zipCode',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Zip Code',
  //               pattern: '^[0-9]{5}$',
  //               errorMessages: {
  //                 pattern: 'Please enter a valid 5-digit zip code.',
  //               },
  //             },
  //             {
  //               key: 'country',
  //               type: 'string',
  //               widget: 'select',
  //               label: 'Country',
  //               dataSource: {
  //                 type: 'api',
  //                 url: '/api/countries',
  //                 method: 'GET',
  //                 params: {},
  //               },
  //             },
  //           ],
  //         },
  //         {
  //           title: 'Previous Addresses',
  //           description: 'Add your previous addresses if applicable.',
  //           repeatable: true,
  //           maxRepeat: 3,
  //           fields: [
  //             {
  //               key: 'previousAddressLine1',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Previous Address Line 1',
  //             },
  //             {
  //               key: 'previousCity',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Previous City',
  //             },
  //             {
  //               key: 'previousState',
  //               type: 'string',
  //               widget: 'select',
  //               label: 'Previous State',
  //               enum: ['CA', 'NY', 'TX', 'WA'],
  //             },
  //             {
  //               key: 'previousZipCode',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Previous Zip Code',
  //               pattern: '^[0-9]{5}$',
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //     {
  //       title: 'Step 3: Employment History',
  //       description: 'List your previous job experiences.',
  //       sections: [
  //         {
  //           title: 'Employment Details',
  //           description: 'Provide your job history.',
  //           repeatable: true,
  //           maxRepeat: 5,
  //           fields: [
  //             {
  //               key: 'companyName',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Company Name',
  //             },
  //             {
  //               key: 'jobTitle',
  //               type: 'string',
  //               widget: 'text',
  //               label: 'Job Title',
  //             },
  //             {
  //               key: 'startDate',
  //               type: 'string',
  //               widget: 'date',
  //               label: 'Start Date',
  //             },
  //             {
  //               key: 'endDate',
  //               type: 'string',
  //               widget: 'date',
  //               label: 'End Date',
  //               visibleIf: {
  //                 field: 'isCurrentJob',
  //                 operator: '!=',
  //                 value: true,
  //               },
  //             },
  //             {
  //               key: 'isCurrentJob',
  //               type: 'boolean',
  //               widget: 'checkbox',
  //               label: 'Is this your current job?',
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //     {
  //       title: 'Step 4: Upload Documents',
  //       description: 'Upload the necessary documents for verification.',
  //       sections: [
  //         {
  //           title: 'Document Uploads',
  //           description:
  //             'Please upload your ID, resume, and other necessary files.',
  //           fields: [
  //             {
  //               key: 'profilePicture',
  //               type: 'string',
  //               widget: 'file',
  //               label: 'Upload Profile Picture',
  //               acceptedFormats: ['jpg', 'png'],
  //               maxFileSize: 5,
  //             },
  //             {
  //               key: 'resume',
  //               type: 'string',
  //               widget: 'file',
  //               label: 'Upload Resume',
  //               acceptedFormats: ['pdf', 'docx'],
  //               maxFileSize: 10,
  //             },
  //             {
  //               key: 'signature',
  //               type: 'string',
  //               widget: 'signature',
  //               label: 'Signature',
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  //   buttons: {
  //     next: {
  //       label: 'Next Step',
  //     },
  //     previous: {
  //       label: 'Previous',
  //     },
  //     submit: {
  //       label: 'Submit Form',
  //       action: '/api/submit-form',
  //     },
  //     customButtons: [
  //       {
  //         label: 'Save Draft',
  //         action: '/api/save-draft',
  //         method: 'POST',
  //       },
  //     ],
  //   },
  // };

  {
    title: 'Simple 2-Step Registration Form',
    description: 'A basic form example for multi-step functionality.',
    type: 'object',
    global: {
      theme: 'default',
      defaultErrorMessages: {
        required: 'This field is required',
      },
      defaultColumns: 1,
    },
    steps: [
      {
        title: 'Step 1: Personal Information',
        description: 'Please provide your personal details.',
        sections: [
          {
            title: 'Basic Information',
            description: 'Fill in your name and email.',
            columns: 1,
            required: ['firstName', 'email'],
            fields: [
              {
                key: 'firstName',
                type: 'string',
                widget: 'text',
                label: 'First Name',
                placeholder: 'Enter your first name',
                required: true,
              },
              {
                key: 'email',
                type: 'string',
                widget: 'email',
                label: 'Email Address',
                placeholder: 'Enter your email address',
                pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
                errorMessages: {
                  pattern: 'Please enter a valid email address.',
                },
                required: true,
              },
            ],
          },
        ],
      },
      // {
      //   title: 'Step 2: Account Details',
      //   description: 'Set up your account password and phone number.',
      //   sections: [
      //     {
      //       title: 'Security Information',
      //       description:
      //         'Choose a secure password and provide your phone number.',
      //       columns: 1,
      //       required: ['password', 'phoneNumber'],
      //       fields: [
      //         {
      //           key: 'password',
      //           type: 'password',
      //           widget: 'password',
      //           label: 'Password',
      //           placeholder: 'Enter your password',
      //           minLength: 8,
      //           required: true,
      //           errorMessages: {
      //             minLength: 'Password must be at least 8 characters long.',
      //           },
      //         },
      //         {
      //           key: 'phoneNumber',
      //           type: 'string',
      //           widget: 'tel',
      //           label: 'Phone Number',
      //           placeholder: 'Enter your phone number',
      //           minLength: 10,
      //           maxLength: 15,
      //           pattern: '^[0-9]+$',
      //           required: true,
      //           errorMessages: {
      //             pattern:
      //               'Please enter a valid phone number with digits only.',
      //           },
      //         },
      //       ],
      //     },
      //   ],
      // },
    ],
    buttons: {
      next: {
        label: 'Next Step',
      },
      previous: {
        label: 'Previous Step',
      },
      submit: {
        label: 'Submit Form',
        action: '/api/submit-form',
      },
    },
  };
