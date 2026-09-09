"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var health_1 = require("./health");
var aime_1 = require("./aime");
var router = (0, express_1.Router)();
router.use(health_1.default);
router.use(aime_1.default);
exports.default = router;
