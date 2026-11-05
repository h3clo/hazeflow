import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNutritionLabel} from '../nutrition.js';
test('reads explicit Korean label values, ignores daily percentages and saturated fat',()=>{
 assert.deepEqual(parseNutritionLabel('총 내용량 100g\n열량 200 kcal\n탄수화물 20g 6%\n단백질 15g 27%\n포화지방 2g\n지방 6g 11%'),{kcal:200,protein:15,carbs:20,fat:6});
});
test('accepts decimals, zero and English labels without inventing missing nutrients',()=>{
 assert.deepEqual(parseNutritionLabel('Energy: 120 kcal; Protein: 0 g; Total fat: 2.5 g'),{kcal:120,protein:0,fat:2.5});
});
test('rejects ambiguous serving columns, unsupported units and out-of-range amounts',()=>{
 assert.throws(()=>parseNutritionLabel('열량 100kcal\n열량 200kcal'),/여러 개/);
 assert.throws(()=>parseNutritionLabel('단백질 50% 지방 200mg'),/값이 없어요/);
 assert.throws(()=>parseNutritionLabel('열량 30000kcal'),/입력 범위/);
 assert.throws(()=>parseNutritionLabel('닭가슴살 100g'),/값이 없어요/);
 assert.deepEqual(parseNutritionLabel('열량 100kcal\n열량 100kcal'),{kcal:100});
});
