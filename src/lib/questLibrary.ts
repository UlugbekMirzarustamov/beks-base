/**
 * Bek's Quest: the library of real-life side quests, the multi-step projects and the weekly
 * challenges. Plain data, no logic (that lives in quests.ts).
 *
 * Every quest has an exact "done when" line, so finishing it is never vague. Most happen away
 * from the screen. There is no XP: the reward is the time you got back and the record of what
 * you actually did.
 */

export type QuestCategory = 'explorer' | 'creator' | 'athlete' | 'scholar' | 'spiritual' | 'human';
export type Energy = 'low' | 'medium' | 'high';
export type Difficulty = 'easy' | 'steady' | 'hard';
/** indoors = at home, outdoors = you have to go out, anywhere = either. */
export type Place = 'indoors' | 'outdoors' | 'anywhere';

export interface Quest {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  /** Estimated minutes. */
  minutes: number;
  energy: Energy;
  difficulty: Difficulty;
  place: Place;
  /** Exactly what counts as done. */
  done: string;
  /** A quick reset for the "I'm about to scroll" button (about 10 minutes, very low barrier). */
  emergency?: boolean;
  /** Only on these weekdays (0 = Monday … 6 = Sunday). */
  days?: number[];
  /** Only between these UK hours (from, to; to is exclusive), e.g. the night sky. */
  hours?: [number, number];
}

export const CATEGORIES: Record<QuestCategory, { name: string; icon: 'globe' | 'photo' | 'flame' | 'book' | 'mat' | 'heart'; blurb: string }> = {
  explorer: { name: 'Explorer', icon: 'globe', blurb: 'Sheffield, the outdoors and a camera' },
  creator: { name: 'Creator', icon: 'photo', blurb: 'Film, edit, write and build' },
  athlete: { name: 'Athlete', icon: 'flame', blurb: 'Football, gym, running and moving well' },
  scholar: { name: 'Scholar', icon: 'book', blurb: 'Engineering, maths, physics, code and books' },
  spiritual: { name: 'Spiritual', icon: 'mat', blurb: 'Qur’an, salah, duas and learning' },
  human: { name: 'Human', icon: 'heart', blurb: 'People, helping, cooking and courage' },
};

type Row = [id: string, title: string, minutes: number, energy: Energy, difficulty: Difficulty, place: Place, description: string, done: string, extra?: Partial<Quest>];
const make = (category: QuestCategory, rows: Row[]): Quest[] =>
  rows.map(([id, title, minutes, energy, difficulty, place, description, done, extra]) => ({ id, category, title, minutes, energy, difficulty, place, description, done, ...extra }));

const EXPLORER = make('explorer', [
  ['ex-endcliffe-sunset', 'Sunset at Endcliffe Park', 45, 'medium', 'easy', 'outdoors', 'Walk to Endcliffe Park in the last hour of light and watch the sky change with your phone in your pocket.', 'You stood in the park for 10 phone-free minutes, then took one photo on the way back.'],
  ['ex-botanical', 'Three glasshouses', 60, 'low', 'easy', 'outdoors', 'Walk through the Botanical Gardens and all three glass pavilions. Read the labels like a museum.', 'You walked through all three pavilions and wrote down the name of one plant you had never seen.'],
  ['ex-meersbrook', 'The view from Meersbrook', 60, 'medium', 'steady', 'outdoors', 'Climb Meersbrook Park to the top near Bishops’ House. One of the best views of the whole city.', 'You reached the top, picked out three landmarks you recognise, and took one wide photo.'],
  ['ex-rivelin', 'Rivelin Valley mill dams', 120, 'high', 'hard', 'outdoors', 'Walk the Rivelin Valley Nature Trail along the river and the old water-powered mill dams.', 'You walked at least 3 km of the trail and passed three mill dams.'],
  ['ex-forge-dam', 'Porter Valley to Forge Dam', 90, 'medium', 'steady', 'outdoors', 'Follow the Porter Brook from Endcliffe Park up through the woods to Forge Dam, and back.', 'You reached Forge Dam on foot and walked back without taking a bus.'],
  ['ex-street-hunt', 'Street photo hunt', 15, 'low', 'easy', 'outdoors', 'Take five photos of small things on your own street that you have walked past and never noticed.', 'Five photos in 15 minutes: no selfies, no people’s faces.'],
  ['ex-kelham', 'Kelham Island old streets', 60, 'medium', 'easy', 'outdoors', 'Explore the old industrial streets and riverside around Kelham Island, where Sheffield made its steel.', 'You walked the riverside and photographed one old brick building or chimney.'],
  ['ex-winter-garden', 'Winter Garden and Peace Gardens', 30, 'low', 'easy', 'outdoors', 'Sit among the giant plants in the Winter Garden, then walk through the Peace Gardens.', 'You sat in the Winter Garden for 10 minutes without your phone, then walked through the Peace Gardens.'],
  ['ex-five-stops', 'Five stops further', 120, 'medium', 'steady', 'outdoors', 'Ride a bus five stops past where you would normally get off, then find your way back on foot.', 'You got off somewhere new and walked back, using your phone map only if you were truly lost.'],
  ['ex-golden-hour', 'Golden hour, ten frames', 45, 'low', 'easy', 'outdoors', 'In the hour before sunset, take exactly ten photos. Then keep only the best one.', 'You took ten photos, deleted nine, and kept one you would print.'],
  ['ex-stanage', 'Stanage Edge', 120, 'high', 'hard', 'outdoors', 'A half-day trip to the gritstone edge above Hathersage, in the Peak District just outside the city.', 'You stood on top of Stanage Edge and looked out over the valley.'],
  ['ex-ecclesall-woods', 'A loop of Ecclesall Woods', 90, 'medium', 'steady', 'outdoors', 'Walk a loop under the trees of Ecclesall Woods, one of the largest woodlands in Sheffield.', 'You walked at least 3 km in the woods and noticed three different kinds of tree.'],
  ['ex-night-sky', 'Find Orion', 15, 'low', 'easy', 'outdoors', 'On a clear night, go outside and find Orion’s belt and the Plough with your own eyes.', 'You found both and stayed outside for 10 minutes looking up.', { hours: [17, 24] }],
  ['ex-memory-map', 'Map it from memory', 45, 'low', 'easy', 'outdoors', 'Draw a map of your neighbourhood from memory on paper, then walk it to see what you got wrong.', 'You drew the map first, walked it, and corrected at least three mistakes.'],
  ['ex-new-cafe', 'A new café, one hour', 60, 'low', 'easy', 'outdoors', 'Walk to a café you have never been to, and read or write there.', 'You stayed 30 minutes with a book or notebook, not your feed.'],
  ['ex-random-book', 'The random shelf', 45, 'low', 'easy', 'outdoors', 'Go to the Central Library or a library floor you have never visited, and pick a book at random.', 'You read five pages of a book you would never normally choose.'],
  ['ex-crookes-valley', 'Two laps of Crookes Valley', 30, 'medium', 'easy', 'outdoors', 'Walk around the lake in Crookes Valley Park, twice, at a brisk pace.', 'Two full laps, phone in your pocket the whole time.'],
  ['ex-weston-museum', 'Three things in Weston Park Museum', 60, 'low', 'easy', 'outdoors', 'Visit Weston Park Museum and find three objects with a story.', 'You wrote down one surprising fact you learned there.'],
  ['ex-around-block', 'Around the block, phone stays home', 10, 'low', 'easy', 'outdoors', 'Put your shoes on and walk around the block. Leave the phone on the table.', 'You walked for 10 minutes without your phone and came back.', { emergency: true }],
]);

const CREATOR = make('creator', [
  ['cr-day-clip', 'A 30-second day in Sheffield', 60, 'medium', 'steady', 'anywhere', 'Film eight short shots of your day (3–4 seconds each) and cut them into one clip.', 'Eight clips filmed and edited into one 30-second video saved on your device.'],
  ['cr-minute-edit', 'One-minute edit', 30, 'low', 'steady', 'indoors', 'Take clips you already have and edit a one-minute video with music and a clear ending.', 'A finished 60-second file is exported and saved.'],
  ['cr-300-words', '300 words about home', 30, 'low', 'easy', 'indoors', 'Write about one memory from Uzbekistan: a smell, a street, a person.', '300 words written, on paper or in a document, not in a chat.'],
  ['cr-photo-essay', 'Five-photo story', 45, 'medium', 'steady', 'outdoors', 'Tell one small story in exactly five photos: a beginning, a middle and an end.', 'Five photos in one album, each with a one-line caption.'],
  ['cr-sketch-desk', 'Draw your desk', 15, 'low', 'easy', 'indoors', 'Sketch your desk exactly as it is, with a pen, no rubber. Quality does not matter.', 'One finished drawing, with every object on the desk in it.'],
  ['cr-letter-home', 'A letter home', 20, 'low', 'easy', 'indoors', 'Write a real letter to your family: what your days look like, and what you are proud of.', 'The letter is finished and sent, or ready to post.'],
  ['cr-script', 'Script a short video', 30, 'low', 'steady', 'indoors', 'Plan a video: one hook line, three points, one ending.', 'A script under 150 words that you could film tomorrow.'],
  ['cr-copy-shot', 'Copy a shot you love', 45, 'medium', 'steady', 'anywhere', 'Pick one frame from a film you love and recreate its framing and light with what you have.', 'Your version, next to the original, saved in one folder.'],
  ['cr-edit-skill', 'Learn one editing move', 30, 'low', 'steady', 'indoors', 'Learn one technique properly: J-cut, L-cut, speed ramp or a simple colour grade.', 'You used it once in a test clip and can explain what it does.'],
  ['cr-voiceover', 'One-minute voiceover', 20, 'low', 'easy', 'indoors', 'Record yourself talking for one minute about your week, like a narrator.', 'One recording, with no more than three restarts.'],
  ['cr-build-hands', 'Build something with your hands', 60, 'medium', 'steady', 'indoors', 'Make a phone stand, a cable holder or a shelf fix from what you have at home.', 'The thing works: it stands, holds or fixes what it was meant to.'],
  ['cr-timelapse', 'Sky timelapse', 30, 'low', 'easy', 'anywhere', 'Set your camera on something steady and film a 20-minute timelapse of the sky or the street.', 'The timelapse is saved, and you did not watch it while it recorded.'],
  ['cr-diary-entry', 'A diary entry with a photo', 30, 'low', 'easy', 'indoors', 'Write today’s entry in the Diary, with one photo you took today.', 'The entry is saved in Reflect → Diary.'],
  ['cr-sound-walk', 'Sound walk', 20, 'low', 'easy', 'outdoors', 'Walk and record three interesting sounds: water, footsteps, a market, birds.', 'Three short sound recordings saved.'],
  ['cr-broll', 'B-roll pack', 45, 'medium', 'steady', 'outdoors', 'Film ten reusable clips for future videos: hands, streets, trees, tea pouring, doors.', 'Ten clips in one folder, each at least 5 seconds long.'],
  ['cr-title-card', 'Design a title card', 30, 'low', 'steady', 'indoors', 'Design a title card or logo for your channel or a project.', 'One finished image exported at full size.'],
  ['cr-teach-camera', 'Teach it on camera', 30, 'medium', 'hard', 'indoors', 'Explain one physics idea in 90 seconds on camera, as if to a friend.', 'One take you would actually show someone.'],
  ['cr-write-it-out', 'Ten minutes on paper', 10, 'low', 'easy', 'indoors', 'Pen and paper: write what you actually want from the rest of today. No editing.', 'One full page, handwritten.', { emergency: true }],
]);

const ATHLETE = make('athlete', [
  ['at-200-touches', '200 touches', 30, 'high', 'steady', 'outdoors', 'Take a ball outside: juggling, wall passes and turns, both feet.', 'You counted 200 touches.'],
  ['at-kickabout', 'Get a game on', 90, 'high', 'steady', 'outdoors', 'Join or organise a kickabout or a five-a-side.', 'You played for at least 45 minutes.'],
  ['at-first-km', 'One kilometre, no stopping', 15, 'medium', 'easy', 'outdoors', 'Run one kilometre at a pace where you could still talk. Slow is fine.', '1 km without stopping to walk.'],
  ['at-5k', 'Run 5k', 45, 'high', 'hard', 'outdoors', 'Run five kilometres. Walking breaks are allowed; finishing is the point.', '5 km covered, start to finish.'],
  ['at-hill-reps', 'Sheffield hill reps', 30, 'high', 'hard', 'outdoors', 'Find a steep street (Sheffield has plenty). Run up hard, walk down slowly.', 'Six reps up the same hill.'],
  ['at-gym-full', 'Full-body gym session', 60, 'high', 'steady', 'outdoors', 'Squat, push, pull, hinge and carry: three working sets of each.', '15 working sets done and written down.'],
  ['at-pushup-ladder', 'Push-up ladder', 10, 'medium', 'easy', 'indoors', 'Do 1 push-up, rest, 2, rest, 3… up to one short of failure, then back down.', 'You finished the ladder up and back down.', { emergency: true }],
  ['at-mobility', 'Mobility reset', 15, 'low', 'easy', 'indoors', 'Hips, hamstrings, back and shoulders: slow stretches on the floor.', 'Fifteen minutes and at least eight different stretches.'],
  ['at-core', 'Core block', 10, 'medium', 'easy', 'indoors', 'Three 45-second planks and three sets of 15 dead bugs.', 'All six sets done.'],
  ['at-stairs', 'Ten flights', 15, 'medium', 'steady', 'anywhere', 'Find stairs (library, flats, a car park) and climb ten flights in total.', 'Ten flights climbed.'],
  ['at-10k-steps', '10,000 steps outside', 90, 'medium', 'easy', 'outdoors', 'One long walk instead of a long scroll.', 'Your step counter shows 10,000 or more by the end.'],
  ['at-sprints', 'Eight sprints', 20, 'high', 'hard', 'outdoors', 'Warm up, then eight 20-second sprints with full rest between.', 'Eight sprints at real effort.'],
  ['at-weak-foot', 'Weak-foot passing', 30, 'medium', 'steady', 'outdoors', 'Wall passes with your weaker foot only, until it feels a bit less weak.', '100 passes with the weaker foot.'],
  ['at-cold-finish', 'Cold finish', 5, 'medium', 'easy', 'indoors', 'End your shower with cold water. Breathe slowly.', 'Sixty seconds of cold water, counted out loud.'],
  ['at-sun-salutes', 'Ten slow salutes', 15, 'low', 'easy', 'indoors', 'Ten slow sun salutations: a full-body stretch that wakes you up.', 'Ten rounds done slowly.'],
  ['at-swim', 'Twenty lengths', 60, 'high', 'steady', 'outdoors', 'Go to the pool and swim twenty lengths, any stroke.', 'Twenty lengths finished.'],
  ['at-skips', '500 skips', 15, 'high', 'steady', 'anywhere', 'A skipping rope and 500 skips, in as many sets as you need.', '500 skips counted.'],
  ['at-circuit', 'Bodyweight circuit', 20, 'high', 'steady', 'indoors', 'Four rounds: 10 squats, 10 push-ups, 10 lunges each side, 20-second plank.', 'Four full rounds.'],
  ['at-cold-reset', 'Cold water reset', 10, 'low', 'easy', 'indoors', 'Splash cold water on your face, then 20 squats and 20 push-ups (from your knees is fine).', 'Water on your face, 20 squats and 20 push-ups done.', { emergency: true }],
]);

const SCHOLAR = make('scholar', [
  ['sc-feynman', 'Explain it to a 12-year-old', 30, 'medium', 'steady', 'indoors', 'Pick one concept from your course and explain it on paper in plain words, as if to a child.', 'One page, no jargon, and you can answer “why?” twice in a row.'],
  ['sc-past-paper', 'One past-paper question, timed', 60, 'high', 'hard', 'indoors', 'One real exam question under exam timing, then mark it honestly.', 'Answer written and marked against the mark scheme.'],
  ['sc-derive', 'Derive it yourself', 30, 'medium', 'hard', 'indoors', 'Derive one formula from first principles, e.g. v² = u² + 2as or the period of a pendulum.', 'The full derivation written out without looking anything up.'],
  ['sc-ten-problems', 'Ten problems', 60, 'high', 'hard', 'indoors', 'Ten maths or physics problems from your module, increasing in difficulty.', 'Ten attempted, every mistake noted with why it happened.'],
  ['sc-20-pages', 'Twenty pages', 30, 'low', 'easy', 'anywhere', 'Twenty pages of a real book (paper or e-reader, not your phone).', 'Twenty pages read and one sentence written about them.'],
  ['sc-code-kata', 'One code kata', 30, 'medium', 'steady', 'indoors', 'Solve one small programming problem in Python from scratch.', 'Your solution runs and passes three tests you wrote yourself.'],
  ['sc-tiny-tool', 'Build a tiny tool', 120, 'high', 'hard', 'indoors', 'Write a small program that solves a real problem for you: a unit converter, a physics calculator, a grade tracker.', 'Someone else could run it and understand what it does.'],
  ['sc-teach-walk', 'Teach-back walk', 30, 'low', 'easy', 'outdoors', 'Go for a walk and explain today’s lecture out loud to yourself (or quietly in your head).', 'You covered the three main ideas without notes.'],
  ['sc-flashcards', 'Ten flashcards by hand', 20, 'low', 'easy', 'indoors', 'Turn one lecture into ten handwritten flashcards: question on the front, answer on the back.', 'Ten cards written and tested once.'],
  ['sc-teardown', 'How does it work?', 45, 'medium', 'steady', 'indoors', 'Take a real object (a kettle, a bike, a door hinge) and sketch how it works, with forces and energy labelled.', 'A labelled sketch you could explain to someone.'],
  ['sc-library-deep', 'Library deep work', 90, 'medium', 'steady', 'outdoors', 'Go to a library, put your phone in your bag, and do two 40-minute blocks of real work.', 'Both 40-minute blocks finished with the phone away.'],
  ['sc-mistake-hunt', 'Mistake hunt', 20, 'low', 'easy', 'indoors', 'Go through one piece of marked work and write down why each mistake happened.', 'Every mistake has a one-line reason next to it.'],
  ['sc-fermi', 'A Fermi estimate', 15, 'low', 'easy', 'anywhere', 'Estimate something huge with reasoning only: how many litres of water are in Crookes Valley lake?', 'An answer, with every step of your reasoning on paper.'],
  ['sc-github', 'Put a project on GitHub', 30, 'medium', 'steady', 'indoors', 'Take one piece of code you wrote and publish it properly, with a short README.', 'The repository is online with a README that explains it.'],
  ['sc-paper', 'Read one research paper’s start', 30, 'medium', 'steady', 'indoors', 'Read the abstract and introduction of one engineering or physics paper.', 'A three-line summary in your own words.'],
  ['sc-mind-map', 'One-page mind map', 30, 'low', 'easy', 'indoors', 'Turn one chapter into a mind map on a single A4 page.', 'Every main idea of the chapter is on the page.'],
  ['sc-ask', 'Ask the question', 15, 'low', 'steady', 'anywhere', 'Write down one thing you don’t understand and actually ask it: your lecturer, a tutor or the course forum.', 'The question is sent.'],
  ['sc-ten-pages-away', 'Phone in another room, ten pages', 10, 'low', 'easy', 'indoors', 'Put your phone in another room, pick up a book, read ten pages.', 'Ten pages read with the phone out of reach.', { emergency: true }],
]);

const SPIRITUAL = make('spiritual', [
  ['sp-page-meaning', 'One page with meaning', 20, 'low', 'easy', 'indoors', 'Read one page of the Qur’an with its translation, slowly.', 'You wrote down one ayah that spoke to you, and why.'],
  ['sp-mosque', 'Pray in the masjid', 45, 'medium', 'easy', 'outdoors', 'Walk to the nearest masjid for the next salah.', 'You prayed in jama’ah.'],
  ['sp-learn-dua', 'Learn one dua by heart', 15, 'low', 'easy', 'anywhere', 'Pick one dua (before sleeping, leaving home, travelling) and learn it with its meaning.', 'You said it from memory twice, and know what it means.'],
  ['sp-adhkar', 'Morning or evening adhkar', 10, 'low', 'easy', 'anywhere', 'Read the morning or evening adhkar slowly, with presence.', 'You finished them without picking up your phone.'],
  ['sp-short-surah', 'Understand a short surah', 20, 'low', 'easy', 'indoors', 'Take a short surah you already know (Al-Asr, Al-Kawthar, Al-Ikhlas) and learn its meaning.', 'You can explain its meaning in your own words.'],
  ['sp-seerah', 'One chapter of the Seerah', 20, 'low', 'easy', 'indoors', 'Read one chapter about the life of the Prophet ﷺ.', 'You wrote down one lesson you can live by this week.'],
  ['sp-sunnah', 'Live one sunnah today', 10, 'low', 'easy', 'anywhere', 'Choose one sunnah and practise it all day: say salaam first, smile, eat with your right hand.', 'You did it at least three times today.'],
  ['sp-dhikr-walk', 'Dhikr walk', 20, 'low', 'easy', 'outdoors', 'Walk slowly and make dhikr instead of listening to anything.', 'Twenty minutes of walking and remembering Allah.'],
  ['sp-tafsir', 'Tafsir of five ayat', 30, 'medium', 'steady', 'indoors', 'Read the tafsir of five ayat from a surah you recite often.', 'You wrote two things you did not know before.'],
  ['sp-two-rakah', 'Fresh wudu, two rak’ah', 10, 'low', 'easy', 'indoors', 'Make fresh wudu and pray two rak’ah of nafl, slowly.', 'Wudu made and two rak’ah prayed without rushing.', { emergency: true }],
  ['sp-dua-list', 'Write a dua list', 15, 'low', 'easy', 'anywhere', 'Write down duas for your family, yourself, your studies and the ummah.', 'A list you can read from in your next sujood.'],
  ['sp-book-chapter', 'An Islamic book chapter', 30, 'low', 'easy', 'indoors', 'Read one chapter of an Islamic book you own or borrow.', 'One chapter read and one note written.'],
  ['sp-sadaqah', 'Quiet sadaqah', 15, 'low', 'easy', 'anywhere', 'Give something today, however small, without telling anyone.', 'It is given.'],
  ['sp-arabic-words', 'Five Qur’anic words', 20, 'low', 'easy', 'indoors', 'Learn five Arabic words that appear often in the Qur’an, with their meanings.', 'You can recognise all five in a page you recite.'],
  ['sp-before-fajr', 'Two rak’ah before Fajr', 15, 'low', 'steady', 'indoors', 'Wake a little earlier and pray two rak’ah in the quiet before Fajr.', 'Prayed before the adhan of Fajr.', { hours: [3, 7] }],
  ['sp-kahf', 'Surah Al-Kahf on Friday', 30, 'low', 'easy', 'indoors', 'Read Surah Al-Kahf this Friday.', 'Read from start to end.', { days: [4] }],
  ['sp-three-ayat', 'Memorise three ayat', 30, 'medium', 'steady', 'indoors', 'Choose three ayat and memorise them, with their meaning.', 'You recited all three from memory in salah.'],
  ['sp-parents-dua', 'Make dua for your parents', 5, 'low', 'easy', 'anywhere', 'Stop what you are doing and make a sincere dua for your parents by name.', 'Dua made, in your own words.'],
]);

const HUMAN = make('human', [
  ['hu-call-home', 'Call home, ask something new', 20, 'low', 'easy', 'anywhere', 'Call your family and ask one question you have never asked them before.', 'You asked it and listened to the whole answer.', { emergency: true }],
  ['hu-real-meal', 'Cook a real meal', 60, 'medium', 'steady', 'indoors', 'Cook from raw ingredients, enough for two portions.', 'You ate it at a table and saved the second portion.'],
  ['hu-cook-for', 'Cook for someone', 90, 'medium', 'hard', 'indoors', 'Invite a flatmate or a friend and cook for both of you.', 'You ate together.'],
  ['hu-meet-up', 'Turn a chat into a meet-up', 10, 'low', 'easy', 'anywhere', 'Message one friend you have not seen in a while and set a real time and place.', 'A day, time and place are agreed.'],
  ['hu-unasked-chore', 'The chore nobody asked for', 15, 'low', 'easy', 'indoors', 'Do one shared job in the flat that nobody asked you to do.', 'It is done, and you did not mention it.'],
  ['hu-study-buddy', 'Ask someone to study with you', 15, 'low', 'steady', 'outdoors', 'Ask someone from your course to work together this week.', 'You asked out loud (or by message) and set a time.'],
  ['hu-society', 'One society event', 120, 'medium', 'hard', 'outdoors', 'Go to one university society event: ISOC, football, film, engineering, anything.', 'You stayed at least 45 minutes and spoke to two new people.'],
  ['hu-volunteer', 'One hour of help', 120, 'medium', 'steady', 'outdoors', 'Volunteer for an hour: a food bank, a masjid clean-up, a charity shop.', 'You did a full hour.'],
  ['hu-thank-you', 'A real thank-you', 10, 'low', 'easy', 'anywhere', 'Write to someone who helped you, and tell them exactly what difference it made.', 'It is sent or handed over.'],
  ['hu-shop-list', 'Three meals, one list', 45, 'medium', 'easy', 'outdoors', 'Plan three meals, write one shopping list, buy only what is on it.', 'You came home with the list and nothing else.'],
  ['hu-recipe-home', 'A recipe from home', 60, 'medium', 'steady', 'indoors', 'Call home and ask how to cook one dish from your childhood, then cook it.', 'The dish is cooked and you sent a photo home.'],
  ['hu-coffee', 'Coffee with someone', 60, 'low', 'steady', 'outdoors', 'Sit down with someone for a coffee or tea, phones away.', 'You talked for at least 30 minutes.'],
  ['hu-compliments', 'Three honest compliments', 15, 'low', 'easy', 'outdoors', 'Give three people a specific, honest compliment today.', 'Three said, out loud.'],
  ['hu-ask-advice', 'Ask for advice', 20, 'low', 'steady', 'anywhere', 'Ask someone older or wiser about one real decision you are facing.', 'You asked and wrote down what they said.'],
  ['hu-teach', 'Help someone with a problem', 30, 'medium', 'steady', 'anywhere', 'Help a classmate or flatmate with something you understand well.', 'They understand it at the end.'],
  ['hu-meal-prep', 'Meal prep for the week', 90, 'medium', 'steady', 'indoors', 'Cook four portions you can take with you this week.', 'Four boxes in the fridge.'],
  ['hu-fix-for', 'Fix something for someone', 30, 'medium', 'steady', 'anywhere', 'Fix a bike, a shelf, a laptop setting or a form for someone else.', 'It works now.'],
  ['hu-flat-game', 'Game night with flatmates', 60, 'medium', 'easy', 'indoors', 'A board game, cards or a match on the console together: real people in the same room.', 'You played together for an hour.'],
  ['hu-fruit-walk', 'Walk to the shop for fruit', 10, 'low', 'easy', 'outdoors', 'Walk to the nearest shop and buy a piece of fruit. Say thank you to the person at the till.', 'Fruit bought, thank you said.', { emergency: true }],
]);

/** Every quest. */
export const QUESTS: Quest[] = [...EXPLORER, ...CREATOR, ...ATHLETE, ...SCHOLAR, ...SPIRITUAL, ...HUMAN];

// ---------------------------------------------------------------- projects
/** A bigger goal with a real result, made of concrete steps you tick off. */
export interface ProjectTemplate {
  id: string;
  category: QuestCategory;
  title: string;
  why: string;
  steps: string[];
}

export const PROJECTS: ProjectTemplate[] = [
  {
    id: 'pr-green-spaces',
    category: 'explorer',
    title: '20 Sheffield green spaces',
    why: 'Sheffield is one of the greenest cities in Europe. Know it with your feet.',
    steps: ['Endcliffe Park', 'Botanical Gardens', 'Weston Park', 'Crookes Valley Park', 'Bingham Park', 'Whiteley Woods', 'Forge Dam', 'Millhouses Park', 'Graves Park', 'Meersbrook Park', 'Norfolk Heritage Park', 'Hillsborough Park', 'Rivelin Valley', 'Ecclesall Woods', 'Peace Gardens', 'Devonshire Green', 'Firth Park', 'Concord Park', 'Chelsea Park', 'Sheffield General Cemetery'],
  },
  {
    id: 'pr-peak-district',
    category: 'explorer',
    title: 'Five Peak District days',
    why: 'The Peak District starts at the edge of the city. Five real days out.',
    steps: ['Stanage Edge', 'Mam Tor', 'Ladybower Reservoir', 'Castleton', 'Kinder Scout'],
  },
  {
    id: 'pr-60s-film',
    category: 'creator',
    title: 'Make and post a 60-second film',
    why: 'From idea to something other people can watch.',
    steps: ['Pick one idea and write the hook', 'Write a shot list', 'Film everything', 'Rough cut', 'Music, sound and subtitles', 'Export and share it'],
  },
  {
    id: 'pr-5k',
    category: 'athlete',
    title: 'Run 5k without stopping',
    why: 'A real, measurable fitness milestone.',
    steps: ['Run 1 km non-stop', 'Run 2 km non-stop', 'Run 3 km non-stop', 'Run 4 km non-stop', 'Run 5 km non-stop'],
  },
  {
    id: 'pr-whole-book',
    category: 'scholar',
    title: 'Finish one whole book',
    why: 'Long attention is a muscle. This trains it.',
    steps: ['Choose the book', 'Read the first quarter', 'Reach halfway', 'Reach three quarters', 'Finish it', 'Write a five-line summary'],
  },
  {
    id: 'pr-program',
    category: 'scholar',
    title: 'Build a program that solves a real problem',
    why: 'Engineering is building things that work.',
    steps: ['Pick a real problem', 'Plan it on paper', 'First working version', 'Test it with real cases', 'Write a README', 'Share it on GitHub'],
  },
  {
    id: 'pr-surah',
    category: 'spiritual',
    title: 'Learn a new surah by heart',
    why: 'Between you and Allah. Nothing here is scored.',
    steps: ['Choose the surah', 'Listen to it five times', 'Learn its meaning', 'Memorise the first half', 'Memorise the second half', 'Recite it in salah'],
  },
  {
    id: 'pr-dishes-from-home',
    category: 'human',
    title: 'Cook five dishes from home',
    why: 'Feed yourself well, and bring a bit of home to Sheffield.',
    steps: ['Plov', 'Lagman', 'Manti', 'Shurpa', 'Samsa'],
  },
];

// ---------------------------------------------------------------- weekly challenges
/** One challenge a week, measured only in real things you did. */
export interface WeeklyChallenge {
  id: string;
  title: string;
  text: string;
  target: number;
  /** What is counted from this week's finished quests. */
  measure: 'minutes' | 'areas' | 'outdoors' | QuestCategory;
}

export const WEEKLY: WeeklyChallenge[] = [
  { id: 'wk-3-hours', title: 'Three hours of real life', text: 'Spend three hours on quests this week.', target: 180, measure: 'minutes' },
  { id: 'wk-four-corners', title: 'Four corners', text: 'Finish quests in four different areas.', target: 4, measure: 'areas' },
  { id: 'wk-get-out', title: 'Get out', text: 'Finish three quests that take you outside.', target: 3, measure: 'outdoors' },
  { id: 'wk-people', title: 'People week', text: 'Finish two Human quests.', target: 2, measure: 'human' },
  { id: 'wk-make', title: 'Make something', text: 'Finish two Creator quests.', target: 2, measure: 'creator' },
  { id: 'wk-move', title: 'Move', text: 'Finish three Athlete quests.', target: 3, measure: 'athlete' },
  { id: 'wk-deep', title: 'Deep work', text: 'Finish three Scholar quests.', target: 3, measure: 'scholar' },
  { id: 'wk-new-ground', title: 'New ground', text: 'Finish two Explorer quests.', target: 2, measure: 'explorer' },
];
