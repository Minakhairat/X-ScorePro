export interface InitialEmployeeSeed {
  id: string;
  serial: number;
  code: string;
  name: string;
  excessCount: number;
  discountPercentage: number;
  recentLogs: {
    id: string;
    delta: number;
    reason: string;
    category: string;
    dateLabel: string;
    recordedByName: string;
    createdAtIso: string;
  }[];
}

export const INITIAL_EMPLOYEES_FROM_EXCEL: InitialEmployeeSeed[] = [
  {
    "id": "emp_956",
    "serial": 1,
    "code": "956",
    "name": "هاني المصري",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_8148",
    "serial": 2,
    "code": "8148",
    "name": "مينا منصور",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_8860",
    "serial": 3,
    "code": "8860",
    "name": "يوسف حليم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_27850",
    "serial": 4,
    "code": "27850",
    "name": "مينا عطا",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_38026",
    "serial": 5,
    "code": "38026",
    "name": "عبدالله عبد السميع",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34257",
    "serial": 6,
    "code": "34257",
    "name": "هشام ياسر",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_38273",
    "serial": 7,
    "code": "38273",
    "name": "السيد على عبد المنعم وهبه",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_33420",
    "serial": 8,
    "code": "33420",
    "name": "روماني سمعان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55706",
    "serial": 9,
    "code": "55706",
    "name": "فادي أشرف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_35031",
    "serial": 10,
    "code": "35031",
    "name": "ساره ناصر",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_48158",
    "serial": 11,
    "code": "48158",
    "name": "ميرنا ناصر",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_28987",
    "serial": 12,
    "code": "28987",
    "name": "كيرلس انيس رشدى خليل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_31403",
    "serial": 13,
    "code": "31403",
    "name": "مدحت عبد الستار عبد اللطيف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_31832",
    "serial": 14,
    "code": "31832",
    "name": "محمد احمدى على عبد المقصود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_33746",
    "serial": 15,
    "code": "33746",
    "name": "محمد جابر عبد الرحمن محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34384",
    "serial": 16,
    "code": "34384",
    "name": "احمد عبد المعطى عبيد حسن",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_39094",
    "serial": 17,
    "code": "39094",
    "name": "احمد جمال احمد ابو الفتوح",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_43698",
    "serial": 18,
    "code": "43698",
    "name": "اسامه خليل ابراهيم",
    "excessCount": 5,
    "discountPercentage": 5,
    "recentLogs": [
      {
        "id": "seed_18_10",
        "delta": 5,
        "reason": "تسجيل يومي (الاثنين 28.9)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الاثنين 28.9",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_43604",
    "serial": 19,
    "code": "43604",
    "name": "اسلام سليمان عبد الستار",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_44420",
    "serial": 20,
    "code": "44420",
    "name": "مصطفى على شحته",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_50377",
    "serial": 21,
    "code": "50377",
    "name": "خالد السيد انور",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_50502",
    "serial": 22,
    "code": "50502",
    "name": "ثروت محمد محمد على",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53753",
    "serial": 23,
    "code": "53753",
    "name": "محمود احمد محمود احمد خليل",
    "excessCount": 25,
    "discountPercentage": 25,
    "recentLogs": [
      {
        "id": "seed_23_24",
        "delta": 25,
        "reason": "تسجيل يومي (الاثنين 12.10)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الاثنين 12.10",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_53754",
    "serial": 24,
    "code": "53754",
    "name": "احمد حسن محمد احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53949",
    "serial": 25,
    "code": "53949",
    "name": "احمد مصطفى محمد عبدالسميع",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_54346",
    "serial": 26,
    "code": "54346",
    "name": "محمد سيد محمد سليمان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55099",
    "serial": 27,
    "code": "55099",
    "name": "محمد جميل محمد معوض",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55455",
    "serial": 28,
    "code": "55455",
    "name": "محمود محمد حسن اسماعيل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55634",
    "serial": 29,
    "code": "55634",
    "name": "بيتر رومان جرجس اديب",
    "excessCount": 25,
    "discountPercentage": 25,
    "recentLogs": [
      {
        "id": "seed_29_24",
        "delta": 25,
        "reason": "تسجيل يومي (الاثنين 12.10)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الاثنين 12.10",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_row_30",
    "serial": 30,
    "code": "",
    "name": "مصطفي محمد عبد العظيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57573",
    "serial": 31,
    "code": "57573",
    "name": "مريم صبحي سلامه",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57606",
    "serial": 32,
    "code": "57606",
    "name": "مريم مرزق مهني",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61269",
    "serial": 33,
    "code": "61269",
    "name": "عبد الرحمن حمدي عبد الحكيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61378",
    "serial": 34,
    "code": "61378",
    "name": "محمد عبد الفتاح السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61383",
    "serial": 35,
    "code": "61383",
    "name": "محمود رفعت عبدالله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61843",
    "serial": 36,
    "code": "61843",
    "name": "حمدي محمد حمدي محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61955",
    "serial": 37,
    "code": "61955",
    "name": "مينا ناجي نقولا حنا",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62016",
    "serial": 38,
    "code": "62016",
    "name": "تسبيح بدران محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62155",
    "serial": 39,
    "code": "62155",
    "name": "نورا سعيد محمود محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62161",
    "serial": 40,
    "code": "62161",
    "name": "حسين ياسر حسين فرج",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62171",
    "serial": 41,
    "code": "62171",
    "name": "مريم احمد عيسي احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_58991",
    "serial": 42,
    "code": "58991",
    "name": "دميانه ايهاب كمال منير",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62153",
    "serial": 43,
    "code": "62153",
    "name": "ريهام جمال سويلم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62414",
    "serial": 44,
    "code": "62414",
    "name": "محمد سمير محمد الورداني",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62450",
    "serial": 45,
    "code": "62450",
    "name": "اسماعيل احمد اسماعيل محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62716",
    "serial": 46,
    "code": "62716",
    "name": "محمد جمال محمد محمود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63058",
    "serial": 47,
    "code": "63058",
    "name": "محمود حسين محمد يوسف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63067",
    "serial": 48,
    "code": "63067",
    "name": "احمد عبدالعزيز عوض عبدالعزيز",
    "excessCount": 25,
    "discountPercentage": 25,
    "recentLogs": [
      {
        "id": "seed_48_24",
        "delta": 25,
        "reason": "تسجيل يومي (الاثنين 12.10)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الاثنين 12.10",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_63185",
    "serial": 49,
    "code": "63185",
    "name": "محمد مصطفي عبدالرحيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65218",
    "serial": 50,
    "code": "65218",
    "name": "محمد ابو هاشم سلامة محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65316",
    "serial": 51,
    "code": "65316",
    "name": "احمد محمد السباعي حسن",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65757",
    "serial": 52,
    "code": "65757",
    "name": "حسين سمير احمد السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65540",
    "serial": 53,
    "code": "65540",
    "name": "مصطفي حازم مصطفي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66042",
    "serial": 54,
    "code": "66042",
    "name": "حامد محمد حامد عبدالعزيز",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61687",
    "serial": 55,
    "code": "61687",
    "name": "احمد حسين عبد الحميد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66132",
    "serial": 56,
    "code": "66132",
    "name": "محمد وائل عبدالصبور",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66171",
    "serial": 57,
    "code": "66171",
    "name": "رمضان ابراهيم رمضان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66170",
    "serial": 58,
    "code": "66170",
    "name": "محمد شحته ابراهيم ابراهيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66168",
    "serial": 59,
    "code": "66168",
    "name": "محمد السيد محمد مجمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53370",
    "serial": 60,
    "code": "53370",
    "name": "وليد وجيه علي احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_43423",
    "serial": 61,
    "code": "43423",
    "name": "مريم عاصم حليم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_row_62",
    "serial": 62,
    "code": "",
    "name": "حازم احمد عبدالهادي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_22343",
    "serial": 63,
    "code": "22343",
    "name": "نصرالله صبحى نصرالله جادالله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_33057",
    "serial": 64,
    "code": "33057",
    "name": "محمد محمد عويس عبد الحافظ",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34717",
    "serial": 65,
    "code": "34717",
    "name": "محمد خالد السيد غريب",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_40522",
    "serial": 66,
    "code": "40522",
    "name": "محمد السيد احمد مصطفى",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_44221",
    "serial": 67,
    "code": "44221",
    "name": "عامر عبد المعطي علي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_44871",
    "serial": 68,
    "code": "44871",
    "name": "محمود احمد بغدادى",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_45570",
    "serial": 69,
    "code": "45570",
    "name": "محمد السيد عبدالمنعم  وهبه",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_49706",
    "serial": 70,
    "code": "49706",
    "name": "احمد محمد احمد السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_50001",
    "serial": 71,
    "code": "50001",
    "name": "على جمال على محمد على",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_50271",
    "serial": 72,
    "code": "50271",
    "name": "نادر السيد محمد على",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_50725",
    "serial": 73,
    "code": "50725",
    "name": "بولا رضا شوقى تقى",
    "excessCount": 10,
    "discountPercentage": 10,
    "recentLogs": [
      {
        "id": "seed_73_23",
        "delta": 10,
        "reason": "تسجيل يومي (الاحد 11.10)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الاحد 11.10",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_53758",
    "serial": 74,
    "code": "53758",
    "name": "محمود عبدالعزيز السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_54447",
    "serial": 75,
    "code": "54447",
    "name": "عبدالله حسن عبدالسلام حسن",
    "excessCount": 10,
    "discountPercentage": 10,
    "recentLogs": [
      {
        "id": "seed_75_23",
        "delta": 10,
        "reason": "تسجيل يومي (الاحد 11.10)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الاحد 11.10",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_54887",
    "serial": 76,
    "code": "54887",
    "name": "مينا شوقى فارس زكى رزق الله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_54889",
    "serial": 77,
    "code": "54889",
    "name": "هانى ابو سيفين ونيس خميس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_54890",
    "serial": 78,
    "code": "54890",
    "name": "هبه مرزق فرج خليل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55623",
    "serial": 79,
    "code": "55623",
    "name": "نادى لطفى مسعود فرج الله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55681",
    "serial": 80,
    "code": "55681",
    "name": "سعيد فايز ثابت برسوم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_56668",
    "serial": 81,
    "code": "56668",
    "name": "شروق محمد محمدين",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57761",
    "serial": 82,
    "code": "57761",
    "name": "انطونيوس جرجس اقلاديوس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57203",
    "serial": 83,
    "code": "57203",
    "name": "ايه وليد فتحي المغير",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_59550",
    "serial": 84,
    "code": "59550",
    "name": "محمد ابو المكارم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_59829",
    "serial": 85,
    "code": "59829",
    "name": "فرحه محمد عبدالرحمن",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61602",
    "serial": 86,
    "code": "61602",
    "name": "يوسف سيد محمد محمد",
    "excessCount": 10,
    "discountPercentage": 10,
    "recentLogs": [
      {
        "id": "seed_86_23",
        "delta": 10,
        "reason": "تسجيل يومي (الاحد 11.10)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الاحد 11.10",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_61669",
    "serial": 87,
    "code": "61669",
    "name": "مصطفي خالد العوضي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61840",
    "serial": 88,
    "code": "61840",
    "name": "عبدالرحمن احمد السيد عمر علي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61893",
    "serial": 89,
    "code": "61893",
    "name": "ياسر السيد ابو قرع",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61936",
    "serial": 90,
    "code": "61936",
    "name": "دميانة اديب ذكري",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62017",
    "serial": 91,
    "code": "62017",
    "name": "مارينا سامح عازر سليمان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62011",
    "serial": 92,
    "code": "62011",
    "name": "نيفين حازم حكيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62209",
    "serial": 93,
    "code": "62209",
    "name": "اسامة عزت كيدة عوض",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62606",
    "serial": 94,
    "code": "62606",
    "name": "ايمن محمد حمدان عبدالفتاح",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53356",
    "serial": 95,
    "code": "53356",
    "name": "محمود سعيد السيد محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62715",
    "serial": 96,
    "code": "62715",
    "name": "محمد صفوت صلاح امين",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63127",
    "serial": 97,
    "code": "63127",
    "name": "احمد محمد علي عبدالعليم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63239",
    "serial": 98,
    "code": "63239",
    "name": "محمد احمد جمعة مجاهد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63314",
    "serial": 99,
    "code": "63314",
    "name": "عبدالله محمد عبده مصطفي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_51108",
    "serial": 100,
    "code": "51108",
    "name": "ابانوب اسحاق سيفين جبرائيل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65517",
    "serial": 101,
    "code": "65517",
    "name": "سيف سامي الصادق محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65803",
    "serial": 102,
    "code": "65803",
    "name": "احمد اشرف عثمان يوسف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65854",
    "serial": 103,
    "code": "65854",
    "name": "احمد راضي محمد احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_43640",
    "serial": 104,
    "code": "43640",
    "name": "اسلام خميس فايق",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65946",
    "serial": 105,
    "code": "65946",
    "name": "عمر ابراهيم السيد هوزال",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66044",
    "serial": 106,
    "code": "66044",
    "name": "عمر اشرف عبدالرحمن مهدي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65995",
    "serial": 107,
    "code": "65995",
    "name": "اسامة طارق عبدالرزاق امين",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62163",
    "serial": 108,
    "code": "62163",
    "name": "كريم سامي فارس وهبة",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_42507",
    "serial": 109,
    "code": "42507",
    "name": "محمد عاطف علي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57437",
    "serial": 110,
    "code": "57437",
    "name": "مينا ممدوح ابراهيم مكسيموس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66183",
    "serial": 111,
    "code": "66183",
    "name": "مايكل مليح سعد عبدالمسيح",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66165",
    "serial": 112,
    "code": "66165",
    "name": "يوسف جمال محمد محمود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_row_113",
    "serial": 113,
    "code": "",
    "name": "صبري محمد علي محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_row_114",
    "serial": 114,
    "code": "",
    "name": "محمد يحي محمد محمود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_row_115",
    "serial": 115,
    "code": "",
    "name": "اسلام صالح محمد حسين",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_24614",
    "serial": 116,
    "code": "24614",
    "name": "نحمده عبد الكريم احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_33701",
    "serial": 117,
    "code": "33701",
    "name": "زعفرانى جابر محمد حسن",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34548",
    "serial": 118,
    "code": "34548",
    "name": "سامى محمد سعدالله حسين",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_40804",
    "serial": 119,
    "code": "40804",
    "name": "احمد محمد عبدالرحمن",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53752",
    "serial": 120,
    "code": "53752",
    "name": "مارينا سامى عبوده تادرس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_54925",
    "serial": 121,
    "code": "54925",
    "name": "ابراهيم محمد حسنى الغلبان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55036",
    "serial": 122,
    "code": "55036",
    "name": "كيرلس سامح يعقوب فام",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57500",
    "serial": 123,
    "code": "57500",
    "name": "محمد عادل محمد حسن",
    "excessCount": 10,
    "discountPercentage": 10,
    "recentLogs": [
      {
        "id": "seed_123_20",
        "delta": 10,
        "reason": "تسجيل يومي (الخميس 8.10)",
        "category": "مخالفة مسجلة",
        "dateLabel": "الخميس 8.10",
        "recordedByName": "بيانات الإكسيل الأساسية",
        "createdAtIso": "2025-10-20T12:00:00.000Z"
      }
    ]
  },
  {
    "id": "emp_59686",
    "serial": 124,
    "code": "59686",
    "name": "عبد الفتاح عبدالله عبدالفتاح",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61400",
    "serial": 125,
    "code": "61400",
    "name": "محمد سيد حسين محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61447",
    "serial": 126,
    "code": "61447",
    "name": "محمود احمد محمد عبد المقصود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61473",
    "serial": 127,
    "code": "61473",
    "name": "وسام مجدي نبيل شاكر",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61524",
    "serial": 128,
    "code": "61524",
    "name": "كريم علي حسن علي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61678",
    "serial": 129,
    "code": "61678",
    "name": "شاكر احمد فتحي ابراهيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62084",
    "serial": 130,
    "code": "62084",
    "name": "محمد حميدو فهمي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62156",
    "serial": 131,
    "code": "62156",
    "name": "غادة احمد امبابي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62162",
    "serial": 132,
    "code": "62162",
    "name": "ماهر احمد محمود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62503",
    "serial": 133,
    "code": "62503",
    "name": "محب نبيل جريس ربيع",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62566",
    "serial": 134,
    "code": "62566",
    "name": "يوسف مجدي عايد بباوي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62679",
    "serial": 135,
    "code": "62679",
    "name": "شهاب اشرف كامل سالم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63246",
    "serial": 136,
    "code": "63246",
    "name": "احمد صلاح محمد سيد عبيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63057",
    "serial": 137,
    "code": "63057",
    "name": "ذكريا ياسر ذكريا السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63701",
    "serial": 138,
    "code": "63701",
    "name": "اسماعيل احمد اسماعيل كامل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_64964",
    "serial": 139,
    "code": "64964",
    "name": "يوسف سعد بسيوني",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65515",
    "serial": 140,
    "code": "65515",
    "name": "زياد صابر عبدالواحد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_59201",
    "serial": 141,
    "code": "59201",
    "name": "هاني عشم الله عطالله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65653",
    "serial": 142,
    "code": "65653",
    "name": "كيرلس سامح ثابت حليم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65738",
    "serial": 143,
    "code": "65738",
    "name": "ادهم علاء الدين حسن",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65853",
    "serial": 144,
    "code": "65853",
    "name": "محمد عيد محمد ابراهيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65852",
    "serial": 145,
    "code": "65852",
    "name": "ادهم هشام فتحي محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65944",
    "serial": 146,
    "code": "65944",
    "name": "ابراهيم محمد جودة علي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65940",
    "serial": 147,
    "code": "65940",
    "name": "احمد امين محمد عبدالقادر",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66045",
    "serial": 148,
    "code": "66045",
    "name": "محمد طارق سيد احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66047",
    "serial": 149,
    "code": "66047",
    "name": "محمد احمد عبدالله السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55368",
    "serial": 150,
    "code": "55368",
    "name": "رامي شنودة عبدالله عطيه",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66130",
    "serial": 151,
    "code": "66130",
    "name": "كيرلس اشرف فيلبس عبدالله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_1055",
    "serial": 152,
    "code": "1055",
    "name": "وجيه حليم غالي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_6462",
    "serial": 153,
    "code": "6462",
    "name": "سامح مجدي امين جرجس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_23206",
    "serial": 154,
    "code": "23206",
    "name": "هانى رضا جوده رزق سيدهم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_27284",
    "serial": 155,
    "code": "27284",
    "name": "رشا عزيز عبدالمسيح",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_27876",
    "serial": 156,
    "code": "27876",
    "name": "كريستين عبيد سليمان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_29618",
    "serial": 157,
    "code": "29618",
    "name": "محمد احمد محمد خليل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_31626",
    "serial": 158,
    "code": "31626",
    "name": "مؤمن محمد ابراهيم امين",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_33790",
    "serial": 159,
    "code": "33790",
    "name": "عمر سالم محمود سالم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_37879",
    "serial": 160,
    "code": "37879",
    "name": "احمد عادل اسماعيل عوض",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_39314",
    "serial": 161,
    "code": "39314",
    "name": "حاتم عبدالله جمعه هلال",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_40469",
    "serial": 162,
    "code": "40469",
    "name": "محمد جمال على",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_48494",
    "serial": 163,
    "code": "48494",
    "name": "ابانوب غالى نصيف رزق",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_43438",
    "serial": 164,
    "code": "43438",
    "name": "بهيره كمال فهمي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_51479",
    "serial": 165,
    "code": "51479",
    "name": "عبدالله محمد احمد صادق العوضى",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53580",
    "serial": 166,
    "code": "53580",
    "name": "محمد عطيه محمد متولى السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53667",
    "serial": 167,
    "code": "53667",
    "name": "سامى عوض يوسف جرجس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53679",
    "serial": 168,
    "code": "53679",
    "name": "احمد حمدى عبدالستار حمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_54694",
    "serial": 169,
    "code": "54694",
    "name": "احمد محمد حسن محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55097",
    "serial": 170,
    "code": "55097",
    "name": "مصطفي عاطف السباعي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55682",
    "serial": 171,
    "code": "55682",
    "name": "احمد محمد خليل عبدالعال",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57604",
    "serial": 172,
    "code": "57604",
    "name": "يحي حمدي شعبان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_row_173",
    "serial": 173,
    "code": "",
    "name": "ايه وائل عطية احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55708",
    "serial": 174,
    "code": "55708",
    "name": "محمد  محمد عبدالمعطى على",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61824",
    "serial": 175,
    "code": "61824",
    "name": "مينا هاني شحاته فرج",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61679",
    "serial": 176,
    "code": "61679",
    "name": "بيشوي عبده نصرالله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62012",
    "serial": 177,
    "code": "62012",
    "name": "ياسمين الطاهر مصطفي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62002",
    "serial": 178,
    "code": "62002",
    "name": "مونيكا مجدي فريد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62008",
    "serial": 179,
    "code": "62008",
    "name": "سناء مختار شفيق",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62007",
    "serial": 180,
    "code": "62007",
    "name": "سارة محمد عبدالله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62087",
    "serial": 181,
    "code": "62087",
    "name": "ايمان ناصر حسن مصطفي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63588",
    "serial": 182,
    "code": "63588",
    "name": "فاطمة محمد عبدالرؤف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63629",
    "serial": 183,
    "code": "63629",
    "name": "شهاب عادل عبدالعاطي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63749",
    "serial": 184,
    "code": "63749",
    "name": "محمد صالح محمد عبدالحميد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_64228",
    "serial": 185,
    "code": "64228",
    "name": "محمد محمد السيد احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_64226",
    "serial": 186,
    "code": "64226",
    "name": "احمد سميح طلبة اسماعيل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_64388",
    "serial": 187,
    "code": "64388",
    "name": "محمد سلامة شعبان قطب",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65850",
    "serial": 188,
    "code": "65850",
    "name": "عبدالرحمن ابراهيم عبدالله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65849",
    "serial": 189,
    "code": "65849",
    "name": "محمد كمال محمود عليوه",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_46197",
    "serial": 190,
    "code": "46197",
    "name": "عبدالغني عاطف عبدالغني",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66049",
    "serial": 191,
    "code": "66049",
    "name": "كريم محمد ماهر علي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66043",
    "serial": 192,
    "code": "66043",
    "name": "يحي محسن محمد وهبه",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_66046",
    "serial": 193,
    "code": "66046",
    "name": "جبريل السيد عبدالخالق",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_27878",
    "serial": 194,
    "code": "27878",
    "name": "خالد على السيد عساف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_30190",
    "serial": 195,
    "code": "30190",
    "name": "فرج سليمان فرج مسيحة",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34208",
    "serial": 196,
    "code": "34208",
    "name": "اشرف ثابت ابراهيم عزيز",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34295",
    "serial": 197,
    "code": "34295",
    "name": "احمد عبد الوهاب عبد الحارس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_38008",
    "serial": 198,
    "code": "38008",
    "name": "ايهاب يسرى بسالى فرح",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_38264",
    "serial": 199,
    "code": "38264",
    "name": "احمد صبرى مصلحى محمود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_39335",
    "serial": 200,
    "code": "39335",
    "name": "احمد محمد احمد محمد خليفة",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_40420",
    "serial": 201,
    "code": "40420",
    "name": "اسامة احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_43184",
    "serial": 202,
    "code": "43184",
    "name": "محمد محمود عبدالبديع حسيني",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_43741",
    "serial": 203,
    "code": "43741",
    "name": "احمد ابو بكر الطنطاوى محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_51346",
    "serial": 204,
    "code": "51346",
    "name": "ابراهيم عصام ابراهيم محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_53602",
    "serial": 205,
    "code": "53602",
    "name": "محمد عباس حامد على",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57446",
    "serial": 206,
    "code": "57446",
    "name": "حياة عاطف امين محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_58988",
    "serial": 207,
    "code": "58988",
    "name": "يوستينا مدحت يوسف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61131",
    "serial": 208,
    "code": "61131",
    "name": "فادي فتحي شوقي ابو عجوة",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61150",
    "serial": 209,
    "code": "61150",
    "name": "فادي ايهاب عاطف يوسف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61144",
    "serial": 210,
    "code": "61144",
    "name": "محمد عصام محمد الجوهري",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61149",
    "serial": 211,
    "code": "61149",
    "name": "روماني عبد الشافي نظير",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61155",
    "serial": 212,
    "code": "61155",
    "name": "ماركو هاني عدلي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61156",
    "serial": 213,
    "code": "61156",
    "name": "احمد سعيد احمد عجمي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61251",
    "serial": 214,
    "code": "61251",
    "name": "عفت بشارة حبيب",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61375",
    "serial": 215,
    "code": "61375",
    "name": "روماني زاخر فاهم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61448",
    "serial": 216,
    "code": "61448",
    "name": "عاطف السيد ذكي رفاعي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61589",
    "serial": 217,
    "code": "61589",
    "name": "احمد السيد ذكي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62083",
    "serial": 218,
    "code": "62083",
    "name": "سعد سعودي عبدالحافظ",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34559",
    "serial": 219,
    "code": "34559",
    "name": "السيد رمضان جمال محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63270",
    "serial": 220,
    "code": "63270",
    "name": "محمود محمد عبدالله حسن",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_row_221",
    "serial": 221,
    "code": "",
    "name": "كريم علي مسعود علي ابراهيم",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_34838",
    "serial": 222,
    "code": "34838",
    "name": "حسن محمد عبد الصمت",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_38267",
    "serial": 223,
    "code": "38267",
    "name": "مصطفى عبد المولى الشحات",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_43742",
    "serial": 224,
    "code": "43742",
    "name": "مصطفى محمود على محمود",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_57534",
    "serial": 225,
    "code": "57534",
    "name": "احمد محمد عبد الغني",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_42318",
    "serial": 226,
    "code": "42318",
    "name": "نبيل ابو الفتوح محمد السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62608",
    "serial": 227,
    "code": "62608",
    "name": "احمد محمد صابر السيد محمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_62677",
    "serial": 228,
    "code": "62677",
    "name": "محمود طارق جميل احمد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_40803",
    "serial": 229,
    "code": "40803",
    "name": "محمد عصام ابراهيم مصطفى",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_39334",
    "serial": 230,
    "code": "39334",
    "name": "محمد فتحي عبد العزيز",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_33970",
    "serial": 231,
    "code": "33970",
    "name": "حلمي حبيب وديع خله",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_61670",
    "serial": 232,
    "code": "61670",
    "name": "محمود عبده السيد",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_38114",
    "serial": 233,
    "code": "38114",
    "name": "عبد الرحيم اسماعيل رفاعي",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_56939",
    "serial": 234,
    "code": "56939",
    "name": "احمد صبري ابراهيم نعمه",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_row_235",
    "serial": 235,
    "code": "",
    "name": "محمد السيد عيد شعبان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_63479",
    "serial": 236,
    "code": "63479",
    "name": "بيتر فؤاد معزوز اندراوس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_65654",
    "serial": 237,
    "code": "65654",
    "name": "ميلاد ماكن توفيق ملك",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_33382",
    "serial": 238,
    "code": "33382",
    "name": "ابانوب سعيد وديع فرج",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_41948",
    "serial": 239,
    "code": "41948",
    "name": "باسم عادل حنس صليب",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_54326",
    "serial": 240,
    "code": "54326",
    "name": "ملاك سمير موسى سلامه سليمان",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_55607",
    "serial": 241,
    "code": "55607",
    "name": "ابانوب عطية كامل عطية ملك",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_56775",
    "serial": 242,
    "code": "56775",
    "name": "ميلاد سامي نعيم فرنسيس",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_59394",
    "serial": 243,
    "code": "59394",
    "name": "سيمون جورج نبيل",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  },
  {
    "id": "emp_30529",
    "serial": 244,
    "code": "30529",
    "name": "رضا نصحي حليم يوسف",
    "excessCount": 0,
    "discountPercentage": 0,
    "recentLogs": []
  }
];
