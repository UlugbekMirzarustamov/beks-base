/**
 * The dua collection: well-known duas from the Qur'an and sahih/hasan hadith, by situation.
 * Arabic, a simple transliteration and the meaning, with the source. Transliterations are only a
 * guide — learn the pronunciation from the Arabic or a teacher. Plain data.
 */
export type DuaTopic = 'study' | 'daily' | 'hard' | 'travel' | 'family' | 'forgive' | 'mosque' | 'ramadan';

export const DUA_TOPICS: Record<DuaTopic, string> = {
  study: 'Study & knowledge',
  daily: 'Daily life',
  hard: 'Hard times',
  travel: 'Travel',
  family: 'Family',
  forgive: 'Forgiveness',
  mosque: 'Mosque & wudu',
  ramadan: 'Ramadan',
};

export interface Dua {
  id: string;
  topic: DuaTopic;
  title: string;
  arabic: string;
  translit: string;
  meaning: string;
  source: string;
}

export const DUAS: Dua[] = [
  { id: 'knowledge', topic: 'study', title: 'For more knowledge', arabic: 'رَبِّ زِدْنِي عِلْمًا', translit: 'Rabbi zidnī ʿilmā', meaning: 'My Lord, increase me in knowledge.', source: 'Qur’an 20:114' },
  { id: 'ease', topic: 'study', title: 'Before studying or an exam', arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي', translit: 'Rabbish-raḥ lī ṣadrī, wa yassir lī amrī, waḥlul ʿuqdatan min lisānī, yafqahū qawlī', meaning: 'My Lord, open my chest for me, make my task easy for me, and untie the knot from my tongue so they understand my speech.', source: 'Qur’an 20:25–28' },
  { id: 'easy', topic: 'study', title: 'When something feels hard', arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا', translit: 'Allāhumma lā sahla illā mā jaʿaltahu sahlā, wa anta tajʿalul-ḥazna idhā shiʾta sahlā', meaning: 'O Allah, nothing is easy except what You make easy, and You make the difficult easy if You wish.', source: 'Ibn Hibban' },
  { id: 'eat-before', topic: 'daily', title: 'Before eating', arabic: 'بِسْمِ اللَّهِ', translit: 'Bismillāh', meaning: 'In the name of Allah. (If you forget at the start: “Bismillāhi awwalahu wa ākhirahu.”)', source: 'Abu Dawud, Tirmidhi' },
  { id: 'eat-after', topic: 'daily', title: 'After eating', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', translit: 'Al-ḥamdu lillāhil-ladhī aṭʿamanī hādhā wa razaqanīhi min ghayri ḥawlin minnī wa lā quwwah', meaning: 'Praise be to Allah who fed me this and provided it for me without any power or strength from me.', source: 'Abu Dawud, Tirmidhi' },
  { id: 'sleep', topic: 'daily', title: 'Before sleeping', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', translit: 'Bismika Allāhumma amūtu wa aḥyā', meaning: 'In Your name, O Allah, I die and I live.', source: 'Bukhari' },
  { id: 'wake', topic: 'daily', title: 'On waking up', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', translit: 'Al-ḥamdu lillāhil-ladhī aḥyānā baʿda mā amātanā wa ilayhin-nushūr', meaning: 'Praise be to Allah who gave us life after He caused us to die, and to Him is the return.', source: 'Bukhari' },
  { id: 'leave-home', topic: 'daily', title: 'Leaving home', arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', translit: 'Bismillāh, tawakkaltu ʿalallāh, wa lā ḥawla wa lā quwwata illā billāh', meaning: 'In the name of Allah, I trust in Allah; there is no power and no strength except with Allah.', source: 'Abu Dawud, Tirmidhi' },
  { id: 'worry', topic: 'hard', title: 'For worry and sadness', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ', translit: 'Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan, wal-ʿajzi wal-kasal, wal-bukhli wal-jubn, wa ḍalaʿid-dayni wa ghalabatir-rijāl', meaning: 'O Allah, I seek refuge in You from worry and grief, from weakness and laziness, from miserliness and cowardice, from the burden of debt and from being overpowered by people.', source: 'Bukhari' },
  { id: 'hasbuna', topic: 'hard', title: 'Allah is enough', arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', translit: 'Ḥasbunallāhu wa niʿmal-wakīl', meaning: 'Allah is enough for us, and He is the best to rely on.', source: 'Qur’an 3:173' },
  { id: 'heart', topic: 'hard', title: 'A steady heart', arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', translit: 'Yā muqallibal-qulūb, thabbit qalbī ʿalā dīnik', meaning: 'O Turner of hearts, keep my heart firm on Your religion.', source: 'Tirmidhi' },
  { id: 'travel', topic: 'travel', title: 'Setting off on a journey', arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', translit: 'Subḥānal-ladhī sakhkhara lanā hādhā wa mā kunnā lahu muqrinīn, wa innā ilā rabbinā lamunqalibūn', meaning: 'Glory be to the One who made this of use to us, which we could not have done ourselves, and to our Lord we will return.', source: 'Qur’an 43:13–14' },
  { id: 'parents', topic: 'family', title: 'For your parents', arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا', translit: 'Rabbir-ḥamhumā kamā rabbayānī ṣaghīrā', meaning: 'My Lord, have mercy on them as they raised me when I was small.', source: 'Qur’an 17:24' },
  { id: 'both-worlds', topic: 'family', title: 'Good in this life and the next', arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', translit: 'Rabbanā ātinā fid-dunyā ḥasanah, wa fil-ākhirati ḥasanah, wa qinā ʿadhāban-nār', meaning: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.', source: 'Qur’an 2:201' },
  { id: 'adam', topic: 'forgive', title: 'Asking forgiveness', arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ', translit: 'Rabbanā ẓalamnā anfusanā wa in lam taghfir lanā wa tarḥamnā lanakūnanna minal-khāsirīn', meaning: 'Our Lord, we have wronged ourselves; if You do not forgive us and have mercy on us, we will surely be among the losers.', source: 'Qur’an 7:23' },
  { id: 'afw', topic: 'forgive', title: 'You love to pardon', arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', translit: 'Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī', meaning: 'O Allah, You are the Pardoner and You love to pardon, so pardon me.', source: 'Tirmidhi' },
  { id: 'mosque-in', topic: 'mosque', title: 'Entering the mosque', arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', translit: 'Allāhummaf-taḥ lī abwāba raḥmatik', meaning: 'O Allah, open for me the doors of Your mercy.', source: 'Muslim' },
  { id: 'mosque-out', topic: 'mosque', title: 'Leaving the mosque', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', translit: 'Allāhumma innī asʾaluka min faḍlik', meaning: 'O Allah, I ask You for Your bounty.', source: 'Muslim' },
  { id: 'wudu', topic: 'mosque', title: 'After wudu', arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ', translit: 'Ashhadu an lā ilāha illallāhu waḥdahu lā sharīka lah, wa ashhadu anna Muḥammadan ʿabduhu wa rasūluh', meaning: 'I bear witness that there is no god but Allah alone, with no partner, and I bear witness that Muhammad is His servant and Messenger.', source: 'Muslim' },
  { id: 'iftar', topic: 'ramadan', title: 'Breaking the fast', arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ', translit: 'Dhahabaẓ-ẓamaʾu wabtallatil-ʿurūqu wa thabatal-ajru in shāʾ Allāh', meaning: 'The thirst has gone, the veins are moistened, and the reward is certain, if Allah wills.', source: 'Abu Dawud' },
];

export interface StarterBook {
  title: string;
  by: string;
  about: string;
}

/** A few widely used classics to start a learning list (tap to add). */
export const STARTER_BOOKS: StarterBook[] = [
  { title: 'The Sealed Nectar (Ar-Raheeq Al-Makhtum)', by: 'Safiur Rahman Mubarakpuri', about: 'The life of the Prophet ﷺ' },
  { title: 'Forty Hadith', by: 'Imam an-Nawawi', about: '42 core hadith with explanations' },
  { title: 'Riyad as-Salihin', by: 'Imam an-Nawawi', about: 'Hadith on character and daily life' },
  { title: 'Fortress of the Muslim (Hisn al-Muslim)', by: 'Saʿid al-Qahtani', about: 'Pocket book of daily duas' },
  { title: 'Tafsir Ibn Kathir (abridged)', by: 'Ibn Kathir', about: 'Explanation of the Qur’an' },
  { title: 'Don’t Be Sad (La Tahzan)', by: 'ʿAid al-Qarni', about: 'Hope and patience in hard times' },
];
