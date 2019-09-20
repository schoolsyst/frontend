import moment from "moment";
import groupBy from "lodash.groupby"

export const state = () => ({
  grades: [],
  tests: [],
  exercises: []
});

export const getters = {
  allGrades(state, getters) {
    return state.grades;
  },
  gradesOf: (state, getters, rootState, rootGetters) => (subjectOrTrimester) => {
    // its a trimester: get the date boundary for the requested trimester
    if (typeof subjectOrTrimester === 'number') {
      let start = rootGetters['schedule/trimesterStart'](subjectOrTrimester);
      // get the end (aka the start of the next one, or the end of the year)
      let end = rootGetters['schedule/trimesterStart'](subjectOrTrimester + 1);

      console.log(`[gradesOf] start=${start} end=${end}`)

      return state.grades.filter(
        grade => {
          let added = moment(grade.added, 'YYYY-MM-DD')
          return added.isSameOrAfter(start) && added.isSameOrBefore(end)
        }
      );
      // its a subject
    } else {
      return getters.allTests.filter(t => t.subject.uuid === subjectOrTrimester).map(t => t.grades[0]);
    }
  },
  gradesIn: (state, getters) => (from, upto) => {
    return state.grades.filter(
      grade => grade.added >= from && grade.added <= upto
    );
  },
  latestGrade: (state, getters) => (grades=null) => {
    grades = grades || getters.allGrades
    let sorted = grades.filter(g => !isNaN(g.actual) && g.actual!==null)
                       .sort((a,b) => moment(a.added, 'YYYY-MM-DD').isBefore(moment(b.added, 'YYYY-MM-DD')) ? 1 : -1)
    return sorted.length ? sorted[0] : null
  },
  gradesEvolution: (state, getters) => (grades=null) => {
    // Get a grades array, default to all grades
    grades = grades || getters.allGrades
    // Get the latest grade, if we can't find it, return NaN
    let latestGrade = getters.latestGrade(grades)
    if (!latestGrade) return NaN
    
    // Get mean of "now"
    let meanNow = getters.meanOfGrades(grades)
    // Get an array of grades that contains all of them but the last one
    // If this array is empty, return NaN: there's nothing to compare the mean against.
    let gradesExceptLast = grades.filter(g => g.uuid !== latestGrade.uuid)
    if (!gradesExceptLast.length) return NaN
    // Get mean of "then" (all the provided grades but the last one)
    let meanThen = getters.meanOfGrades(gradesExceptLast)
    
    // Compute the relative difference between the two means
    let relativeDiff = (meanNow - meanThen) / meanThen

    // Also return the two means, could be useful for an absolute difference 
    // or simply displaying the mean before the latest grade
    return {relativeDiff, meanThen, meanNow}
  },
  currentTrimesterGradesEvolution(state, getters) {
    return getters.gradesEvolution(getters.currentTrimesterGrades)
  },
  allTests(state, getters) {
    return state.tests;
  },
  dueTests(state, getters) {
    return getters.allTests.filter(test => moment(test.due, 'YYYY-MM-DD').isAfter(moment()));
  },
  pastTests(state, getters) {
    return getters.allTests.filter(test => moment(test.due, 'YYYY-MM-DD').isSameOrBefore(moment()));
  },
  ungradedTests(state, getters) {
    return getters.allTests.filter(test => !test.grades && !test.grades.length);
  },
  gradedTests(state, getters) {
    let tests = [];
    for (const grade of state.grades) {
      tests.push(grade.test);
    }
    return tests;
  },
  meanOfGrades: (state, getters) => grades => {
    let vals = grades.map(g => g.actual).filter(v => !isNaN(v) && v!==null)
    if (!vals.length) return NaN
    let sum = vals.reduce((acc, cur) => acc+cur)
    return sum / vals.length
  },
  meanOf: (state, getters, rootState, rootGetters) => (subjectOrTrimester) => {
    // get an array containing the grade values from the requested subject/trimester
    let grades = getters.gradesOf(subjectOrTrimester);
    let mean = getters.meanOfGrades(grades)
    return mean;
  },
  globalMean: (state, getters, rootState, rootGetters) => {
    console.group('globalMean')
    let grades = getters.allGrades.map(grade => grade.actual).filter(actual => !isNaN(actual) && actual !== null);
    let mean = getters.meanOfGrades(grades)
    console.groupEnd()
    return mean;
  },
  currentTrimesterGrades(state, getters, rootState, rootGetters) {
    return getters.gradesOf(rootGetters['schedule/currentTrimester'])
  },
  currentTrimesterMean(state, getters) {
    console.log(getters.currentTrimesterGrades)
    return getters.meanOfGrades(getters.currentTrimesterGrades)
  },

  allExercises(state, getters) {
    return state.exercises;
  },
  dueExercises(state, getters) {
    return getters.allExercises.filter(
      exercise => moment(exercise.due, 'YYYY-MM-DD').isAfter(moment())
    );
  },
  pendingExercises(state, getters) {
    return getters.dueExercises.filter(exercise => !exercise.completed);
  },
  uncompleteExercises(state, getters) {
    return getters.allExercises.filter(exercise => !exercise.completed);
  },
  groupedHomework(state, getters) {
    let exercises = getters.dueExercises
    let tests = getters.dueTests
    let grouppedExs = groupBy(exercises, "due")
    let grouppedTests = groupBy(tests, "due")
    let groupped = {}
    for (const [due, exercises] of Object.entries(grouppedExs)) {
      if (due in groupped) {
        groupped[due]['exercises'] = exercises
      } else {
        groupped[due] = { exercises }
      }
    }
    for (const [due, tests] of Object.entries(grouppedTests)) {
      if (due in groupped) {
        groupped[due]['tests'] = tests
      } else {
        groupped[due] = { tests }
      }
    }
    let arrayed = Object.keys(groupped).map(k => [k, groupped[k]])
    let sorted  = arrayed.sort((a, b) => {
      let adate = moment(a[0], 'YYYY-MM-DD')
      let bdate = moment(b[0], 'YYYY-MM-DD')
      return adate.isAfter(bdate) ? 1 : -1
    })
    return sorted
  },
  test: (state, getters) => (uuid) => {
    return state.tests.find(t => t.uuid === uuid)
  },
  
};

export const mutations = {
  UPDATE_GRADE(state, args) {
    let { uuid, data } = args
    // Get grade
    let grade = state.grades.find(grade => grade.uuid === uuid);

    // Compute new grade
    Object.assign(grade, data);

    // Remove the original grade
    state.grades = state.grades.filter(grade => grade.uuid !== uuid);

    // Add the modified grade
    state.grades.push(grade);
  },
  UPDATE_EXERCISE(state, args) {
    let { uuid, data } = args
    // Get exercise
    let exercise = state.exercises.find(exercise => exercise.uuid === uuid);

    // Compute new exercise
    Object.assign(exercise, data);

    // Remove the original exercise
    state.exercises = state.exercises.filter(exercise => exercise.uuid !== uuid);

    // Add the modified exercise
    state.exercises.push(exercise);
  },
  UPDATE_TEST(state, args) {
    let { uuid, data } = args
    // Get test
    let test = state.tests.find(test => test.uuid === uuid);

    // Compute new test
    Object.assign(test, data);

    // Remove the original test
    state.tests = state.tests.filter(test => test.uuid !== uuid);

    // Add the modified test
    state.tests.push(test);
  },
  SET_TESTS(state, tests) {
    state.tests = tests;
  },
  SET_EXERCISES(state, exercises) {
    state.exercises = exercises;
  },
  SET_GRADES(state, grades) {
    state.grades = grades;
  },
  ADD_EXERCISE(state, exercise) {
    state.exercises.push(exercise)
  },
  ADD_TEST(state, test) {
    state.tests.push(test)
  },
  SWITCH_EXERCISE_COMPLETED(state, exerciseUUID) {
    let exercise = state.exercises.find(ex => ex.uuid === exerciseUUID)
    if (!exercise) return
    state.exercises[state.exercises.indexOf(exercise)].completed = !exercise.completed
  },
  ADD_GRADE(state, grade) {
    state.grades.push(grade)
  },
  DELETE_TEST(state, testUUID) {
    //FIXME
    state.tests = state.tests.filter(t => t.uuid !== testUUID)
  },
  CHANGE_EXERCISE(state, exerciseUUID, newExerciseData) {
    let i = state.exercises.indexOf(state.exercises.find(e=>e.uuid===exerciseUUID))
    Object.assign(state.exercises[i], newExerciseData)
  }
};

export const actions = {
};
