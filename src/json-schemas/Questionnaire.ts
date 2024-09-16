export const QuestionnaireSchema = {
  question_type: [
    {
      question_type_id: 1,
      type_name: 'multiple_choice',
      description: 'Students select the correct answer from a list of options.',
    },
    {
      question_type_id: 2,
      type_name: 'true_false',
      description:
        'Students indicate whether a given statement is true or false.',
    },
    {
      question_type_id: 3,
      type_name: 'fill_in_the_blanks',
      description:
        'Students fill in missing words or phrases in a sentence or passage.',
    },
    {
      question_type_id: 4,
      type_name: 'short_answer',
      description: 'Students provide brief, usually one-sentence answers.',
    },
    {
      question_type_id: 5,
      type_name: 'essay',
      description:
        'Students write longer, more detailed responses, often involving analysis, explanation, or opinion.',
    },
    {
      question_type_id: 6,
      type_name: 'matching',
      description:
        'Students match items from two lists, such as terms and their definitions, by drawing lines or writing corresponding letters/numbers.',
    },
    {
      question_type_id: 7,
      type_name: 'cloze_test',
      description:
        'A type of fill-in-the-blank test where students complete a passage with missing words based on context.',
    },
    {
      question_type_id: 8,
      type_name: 'labeling_diagram',
      description:
        'Students write the correct terms to label parts of a diagram, such as in biology, geography, or physics.',
    },
    {
      question_type_id: 9,
      type_name: 'ordering',
      description:
        'Students write or arrange events, steps, or concepts in a logical order, such as chronological events in history or steps in a process.',
    },
    {
      question_type_id: 10,
      type_name: 'problem_solving',
      description:
        'Students solve mathematical, scientific, or logical problems, showing their calculations and reasoning in writing.',
    },
    {
      question_type_id: 11,
      type_name: 'open_ended',
      description:
        'Students answer questions with more flexibility, allowing for various valid responses based on understanding.',
    },
    {
      question_type_id: 12,
      type_name: 'source_based',
      description:
        'Students respond to questions by analyzing a given source, such as a text, graph, or image.',
    },
  ],
  question: [
    {
      question_id: 1,
      question_text: 'What is the capital of France?',
      question_type_id: 1,
    },
    {
      question_id: 2,
      question_text: 'The sun rises in the west.',
      question_type_id: 2,
    },
    {
      question_id: 3,
      question_text: 'The largest planet in our solar system is _______.',
      question_type_id: 3,
    },
    {
      question_id: 4,
      question_text: 'What is the boiling point of water?',
      question_type_id: 4,
    },
    {
      question_id: 5,
      question_text: 'Explain how photosynthesis works in plants.',
      question_type_id: 5,
    },
    {
      question_id: 6,
      question_text: 'Match the animals to their habitats:',
      question_type_id: 6,
    },
    {
      question_id: 7,
      question_text:
        'Complete the sentence: The Earth revolves around the _______.',
      question_type_id: 7,
    },
    {
      question_id: 8,
      question_text: 'Label the parts of a flower in the diagram.',
      question_type_id: 8,
    },
    {
      question_id: 9,
      question_text: 'Arrange the steps of the water cycle in order:',
      question_type_id: 9,
    },
    {
      question_id: 10,
      question_text:
        'If a car travels 60 kilometers in 2 hours, how fast is the car traveling?',
      question_type_id: 10,
    },
    {
      question_id: 11,
      question_text:
        'Describe one way in which recycling benefits the environment.',
      question_type_id: 11,
    },
    {
      question_id: 12,
      question_text:
        'Analyze the chart showing the number of endangered species over time. Identify the year with the largest increase.',
      question_type_id: 12,
    },
  ],
  multiple_choice_option: [
    {
      multiple_choice_option_id: 1,
      question_id: 1,
      option_text: 'Paris',
    },
    {
      multiple_choice_option_id: 2,
      question_id: 1,
      option_text: 'London',
    },
    {
      multiple_choice_option_id: 3,
      question_id: 1,
      option_text: 'Berlin',
    },
    {
      multiple_choice_option_id: 4,
      question_id: 1,
      option_text: 'Madrid',
    },
  ],
  true_false_option: [
    {
      true_false_option_id: 1,
      question_id: 2,
      option_text: 'True',
    },
    {
      true_false_option_id: 2,
      question_id: 2,
      option_text: 'False',
    },
  ],
  fill_in_the_blanks_answer: [
    {
      fill_in_the_blanks_answer_id: 1,
      question_id: 3,
      correct_answer: 'Jupiter',
    },
  ],
  short_answer_answer: [
    {
      short_answer_answer_id: 1,
      question_id: 4,
      correct_answer: '100°C',
    },
  ],
  essay_answer: [
    {
      essay_answer_id: 1,
      question_id: 5,
      correct_answer:
        'Photosynthesis is the process by which plants use sunlight, carbon dioxide, and water to produce food and oxygen.',
    },
  ],
  matching_pair: [
    {
      matching_pair_id: 1,
      question_id: 6,
      option_text: 'Lion',
      match_text: 'Savannah',
    },
    {
      matching_pair_id: 2,
      question_id: 6,
      option_text: 'Penguin',
      match_text: 'Antarctica',
    },
    {
      matching_pair_id: 3,
      question_id: 6,
      option_text: 'Kangaroo',
      match_text: 'Australia',
    },
    {
      matching_pair_id: 4,
      question_id: 6,
      option_text: 'Polar Bear',
      match_text: 'Arctic',
    },
  ],
  cloze_test_passage: [
    {
      cloze_test_passage_id: 1,
      question_id: 7,
      passage: 'The Earth revolves around the _______.',
    },
  ],
  cloze_test_answer: [
    {
      cloze_test_answer_id: 1,
      cloze_test_passage_id: 1,
      answer_text: 'sun',
    },
  ],
  labeling_diagram: [
    {
      labeling_diagram_id: 1,
      question_id: 8,
      diagram_url: 'https://example.com/flower_diagram.png',
    },
  ],
  ordering_step: [
    {
      ordering_step_id: 1,
      question_id: 9,
      step_text: 'Evaporation',
    },
    {
      ordering_step_id: 2,
      question_id: 9,
      step_text: 'Condensation',
    },
    {
      ordering_step_id: 3,
      question_id: 9,
      step_text: 'Precipitation',
    },
    {
      ordering_step_id: 4,
      question_id: 9,
      step_text: 'Collection',
    },
  ],
  problem_solving_answer: [
    {
      problem_solving_answer_id: 1,
      question_id: 10,
      correct_answer: '30 kilometers per hour',
    },
  ],
  open_ended_answer: [
    {
      open_ended_answer_id: 1,
      question_id: 11,
      answer_text:
        'Recycling helps reduce waste, conserve natural resources, and decrease pollution.',
    },
  ],
  source_based_question: [
    {
      source_based_question_id: 1,
      question_id: 12,
      graph_url: 'https://example.com/endangered_species_chart.png',
    },
  ],
  correct_answer: [
    {
      correct_answer_id: 1,
      question_id: 1,
      multiple_choice_option_id: 1,
      true_false_option_id: null,
      fill_in_the_blanks_answer_id: null,
      short_answer_answer_id: null,
      essay_answer_id: null,
      matching_pairs: null,
      cloze_test_answer_id: null,
      ordering_steps: null,
      problem_solving_answer_id: null,
      open_ended_answer_id: null,
    },
    {
      correct_answer_id: 2,
      question_id: 2,
      multiple_choice_option_id: null,
      true_false_option_id: 2,
      fill_in_the_blanks_answer_id: null,
      short_answer_answer_id: null,
      essay_answer_id: null,
      matching_pairs: null,
      cloze_test_answer_id: null,
      ordering_steps: null,
      problem_solving_answer_id: null,
      open_ended_answer_id: null,
    },
    {
      correct_answer_id: 3,
      question_id: 3,
      multiple_choice_option_id: null,
      true_false_option_id: null,
      fill_in_the_blanks_answer_id: 1,
      short_answer_answer_id: null,
      essay_answer_id: null,
      matching_pairs: null,
      cloze_test_answer_id: null,
      ordering_steps: null,
      problem_solving_answer_id: null,
      open_ended_answer_id: null,
    },
    {
      correct_answer_id: 4,
      question_id: 4,
      multiple_choice_option_id: null,
      true_false_option_id: null,
      fill_in_the_blanks_answer_id: null,
      short_answer_answer_id: 1,
      essay_answer_id: null,
      matching_pairs: null,
      cloze_test_answer_id: null,
      ordering_steps: null,
      problem_solving_answer_id: null,
      open_ended_answer_id: null,
    },
    {
      correct_answer_id: 5,
      question_id: 5,
      multiple_choice_option_id: null,
      true_false_option_id: null,
      fill_in_the_blanks_answer_id: null,
      short_answer_answer_id: null,
      essay_answer_id: 1,
      matching_pairs: null,
      cloze_test_answer_id: null,
      ordering_steps: null,
      problem_solving_answer_id: null,
      open_ended_answer_id: null,
    },
  ],
};
