<!-- 歌曲列表 -->
<popup
  config="{{main.popupConfig}}"
  show="{{showPopup}}"
  catch:confirm="hidePopup"
  catch:close="hidePopup"
>
  <view class="title">小程序模板地址 </view>

  <view class="link">https://github.com/Mister-Hope/miniapp-template </view>
</popup>


{
  "type": "Program",
  "body": [
    {
      "type": "WXText",
      "value": "\n\n",
      "start": 0,
      "end": 1,
      "loc": {
        "start": {
          "line": 1,
          "column": 1
        },
        "end": {
          "line": 2,
          "column": 1
        }
      },
      "range": [
        0,
        1
      ]
    },
    {
      "type": "WXComment",
      "value": " 歌曲列表 ",
      "start": 2,
      "end": 14,
      "loc": {
        "start": {
          "line": 3,
          "column": 1
        },
        "end": {
          "line": 3,
          "column": 13
        }
      },
      "range": [
        2,
        14
      ]
    },
    {
      "type": "WXText",
      "value": "\n",
      "start": 15,
      "end": 15,
      "loc": {
        "start": {
          "line": 3,
          "column": 14
        },
        "end": {
          "line": 3,
          "column": 14
        }
      },
      "range": [
        15,
        15
      ]
    },
    {
      "type": "WXElement",
      "name": "popup",
      "children": [
        {
          "type": "WXText",
          "value": "\n  ",
          "start": 133,
          "end": 135,
          "loc": {
            "start": {
              "line": 9,
              "column": 2
            },
            "end": {
              "line": 10,
              "column": 2
            }
          },
          "range": [
            133,
            135
          ]
        },
        {
          "type": "WXElement",
          "name": "view",
          "children": [
            {
              "type": "WXText",
              "value": "小程序模板地址 ",
              "start": 156,
              "end": 163,
              "loc": {
                "start": {
                  "line": 10,
                  "column": 23
                },
                "end": {
                  "line": 10,
                  "column": 30
                }
              },
              "range": [
                156,
                163
              ]
            }
          ],
          "startTag": {
            "type": "WXStartTag",
            "name": "view",
            "attributes": [
              {
                "type": "WXAttribute",
                "key": "class",
                "quote": "\"",
                "value": "title",
                "rawValue": "\"title\"",
                "children": [],
                "interpolations": [],
                "start": 142,
                "end": 154,
                "loc": {
                  "start": {
                    "line": 10,
                    "column": 9
                  },
                  "end": {
                    "line": 10,
                    "column": 21
                  }
                },
                "range": [
                  142,
                  154
                ]
              }
            ],
            "selfClosing": false,
            "start": 136,
            "end": 155,
            "loc": {
              "start": {
                "line": 10,
                "column": 3
              },
              "end": {
                "line": 10,
                "column": 22
              }
            },
            "range": [
              136,
              155
            ]
          },
          "endTag": {
            "type": "WXEndTag",
            "name": "view",
            "start": 164,
            "end": 170,
            "loc": {
              "start": {
                "line": 10,
                "column": 31
              },
              "end": {
                "line": 10,
                "column": 37
              }
            },
            "range": [
              164,
              170
            ]
          },
          "start": 136,
          "end": 170,
          "loc": {
            "start": {
              "line": 10,
              "column": 3
            },
            "end": {
              "line": 10,
              "column": 37
            }
          },
          "range": [
            136,
            170
          ]
        },
        {
          "type": "WXText",
          "value": "\n\n  ",
          "start": 171,
          "end": 174,
          "loc": {
            "start": {
              "line": 10,
              "column": 38
            },
            "end": {
              "line": 12,
              "column": 2
            }
          },
          "range": [
            171,
            174
          ]
        },
        {
          "type": "WXElement",
          "name": "view",
          "children": [
            {
              "type": "WXText",
              "value": "https://github.com/Mister-Hope/miniapp-template ",
              "start": 194,
              "end": 241,
              "loc": {
                "start": {
                  "line": 12,
                  "column": 22
                },
                "end": {
                  "line": 12,
                  "column": 69
                }
              },
              "range": [
                194,
                241
              ]
            }
          ],
          "startTag": {
            "type": "WXStartTag",
            "name": "view",
            "attributes": [
              {
                "type": "WXAttribute",
                "key": "class",
                "quote": "\"",
                "value": "link",
                "rawValue": "\"link\"",
                "children": [],
                "interpolations": [],
                "start": 181,
                "end": 192,
                "loc": {
                  "start": {
                    "line": 12,
                    "column": 9
                  },
                  "end": {
                    "line": 12,
                    "column": 20
                  }
                },
                "range": [
                  181,
                  192
                ]
              }
            ],
            "selfClosing": false,
            "start": 175,
            "end": 193,
            "loc": {
              "start": {
                "line": 12,
                "column": 3
              },
              "end": {
                "line": 12,
                "column": 21
              }
            },
            "range": [
              175,
              193
            ]
          },
          "endTag": {
            "type": "WXEndTag",
            "name": "view",
            "start": 242,
            "end": 248,
            "loc": {
              "start": {
                "line": 12,
                "column": 70
              },
              "end": {
                "line": 12,
                "column": 76
              }
            },
            "range": [
              242,
              248
            ]
          },
          "start": 175,
          "end": 248,
          "loc": {
            "start": {
              "line": 12,
              "column": 3
            },
            "end": {
              "line": 12,
              "column": 76
            }
          },
          "range": [
            175,
            248
          ]
        },
        {
          "type": "WXText",
          "value": "\n",
          "start": 249,
          "end": 249,
          "loc": {
            "start": {
              "line": 12,
              "column": 77
            },
            "end": {
              "line": 12,
              "column": 77
            }
          },
          "range": [
            249,
            249
          ]
        }
      ],
      "startTag": {
        "type": "WXStartTag",
        "name": "popup",
        "attributes": [
          {
            "type": "WXAttribute",
            "key": "config",
            "quote": "\"",
            "value": "{{main.popupConfig}}",
            "rawValue": "\"{{main.popupConfig}}\"",
            "children": [
              {
                "type": "WXAttributeInterpolation",
                "rawValue": "{{main.popupConfig}}",
                "value": "main.popupConfig",
                "start": 33,
                "end": 52,
                "loc": {
                  "start": {
                    "line": 5,
                    "column": 11
                  },
                  "end": {
                    "line": 5,
                    "column": 30
                  }
                },
                "range": [
                  33,
                  52
                ]
              }
            ],
            "interpolations": [
              {
                "type": "WXInterpolation",
                "rawValue": "{{main.popupConfig}}",
                "value": "main.popupConfig",
                "start": 33,
                "end": 52,
                "loc": {
                  "start": {
                    "line": 5,
                    "column": 11
                  },
                  "end": {
                    "line": 5,
                    "column": 30
                  }
                },
                "range": [
                  33,
                  52
                ]
              }
            ],
            "start": 25,
            "end": 53,
            "loc": {
              "start": {
                "line": 5,
                "column": 3
              },
              "end": {
                "line": 5,
                "column": 31
              }
            },
            "range": [
              25,
              53
            ]
          },
          {
            "type": "WXAttribute",
            "key": "show",
            "quote": "\"",
            "value": "{{showPopup}}",
            "rawValue": "\"{{showPopup}}\"",
            "children": [
              {
                "type": "WXAttributeInterpolation",
                "rawValue": "{{showPopup}}",
                "value": "showPopup",
                "start": 63,
                "end": 75,
                "loc": {
                  "start": {
                    "line": 6,
                    "column": 9
                  },
                  "end": {
                    "line": 6,
                    "column": 21
                  }
                },
                "range": [
                  63,
                  75
                ]
              }
            ],
            "interpolations": [
              {
                "type": "WXInterpolation",
                "rawValue": "{{showPopup}}",
                "value": "showPopup",
                "start": 63,
                "end": 75,
                "loc": {
                  "start": {
                    "line": 6,
                    "column": 9
                  },
                  "end": {
                    "line": 6,
                    "column": 21
                  }
                },
                "range": [
                  63,
                  75
                ]
              }
            ],
            "start": 57,
            "end": 76,
            "loc": {
              "start": {
                "line": 6,
                "column": 3
              },
              "end": {
                "line": 6,
                "column": 22
              }
            },
            "range": [
              57,
              76
            ]
          },
          {
            "type": "WXAttribute",
            "key": "catch:confirm",
            "quote": "\"",
            "value": "hidePopup",
            "rawValue": "\"hidePopup\"",
            "children": [],
            "interpolations": [],
            "start": 80,
            "end": 104,
            "loc": {
              "start": {
                "line": 7,
                "column": 3
              },
              "end": {
                "line": 7,
                "column": 27
              }
            },
            "range": [
              80,
              104
            ]
          },
          {
            "type": "WXAttribute",
            "key": "catch:close",
            "quote": "\"",
            "value": "hidePopup",
            "rawValue": "\"hidePopup\"",
            "children": [],
            "interpolations": [],
            "start": 108,
            "end": 130,
            "loc": {
              "start": {
                "line": 8,
                "column": 3
              },
              "end": {
                "line": 8,
                "column": 25
              }
            },
            "range": [
              108,
              130
            ]
          }
        ],
        "selfClosing": false,
        "start": 16,
        "end": 132,
        "loc": {
          "start": {
            "line": 4,
            "column": 1
          },
          "end": {
            "line": 9,
            "column": 1
          }
        },
        "range": [
          16,
          132
        ]
      },
      "endTag": {
        "type": "WXEndTag",
        "name": "popup",
        "start": 250,
        "end": 257,
        "loc": {
          "start": {
            "line": 13,
            "column": 1
          },
          "end": {
            "line": 13,
            "column": 8
          }
        },
        "range": [
          250,
          257
        ]
      },
      "start": 16,
      "end": 257,
      "loc": {
        "start": {
          "line": 4,
          "column": 1
        },
        "end": {
          "line": 13,
          "column": 8
        }
      },
      "range": [
        16,
        257
      ]
    },
    {
      "type": "WXText",
      "value": "\n",
      "start": 258,
      "end": 258,
      "loc": {
        "start": {
          "line": 13,
          "column": 9
        },
        "end": {
          "line": 13,
          "column": 9
        }
      },
      "range": [
        258,
        258
      ]
    }
  ],
  "comments": [],
  "errors": [],
  "tokens": [],
  "start": 0,
  "end": 258,
  "loc": {
    "start": {
      "line": 1,
      "column": 1
    },
    "end": {
      "line": 13,
      "column": 9
    }
  },
  "range": [
    0,
    258
  ]
}