import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyActivity} from '../activity-classify.js';

test('사용자 요청 예시 4가지를 정확히 분류한다', () => {
 assert.equal(classifyActivity('레그프레스 25 10'), '운동');
 assert.equal(classifyActivity('영어 공부 시작'), '공부');
 assert.equal(classifyActivity('점심으로 김치찌개 먹음'), '식사');
 assert.equal(classifyActivity('회의 참석'), '업무');
});

test('다양한 활동 키워드를 올바르게 분류한다', () => {
 assert.equal(classifyActivity('랫풀다운 15 15 3'), '운동');
 assert.equal(classifyActivity('스쿼트 50 10 3세트'), '운동');
 assert.equal(classifyActivity('가벼운 스트레칭과 유산소 20분'), '운동');
 assert.equal(classifyActivity('오운완 완료!'), '운동');

 assert.equal(classifyActivity('아침으로 샐러드와 사과'), '식사');
 assert.equal(classifyActivity('아메리카노 한 잔 마심'), '식사');
 assert.equal(classifyActivity('삼겹살에 밥 먹기'), '식사');

 assert.equal(classifyActivity('파이썬 코딩 강의 듣는 중'), '공부');
 assert.equal(classifyActivity('자격증 시험 문제집 풀기'), '공부');
 assert.equal(classifyActivity('독서 30분 책 읽기'), '공부');

 assert.equal(classifyActivity('주간 업무 보고서 작성'), '업무');
 assert.equal(classifyActivity('팀 미팅 진행'), '업무');
 assert.equal(classifyActivity('슬랙 메시지 확인 및 출근'), '업무');

 assert.equal(classifyActivity('잠깐 침대에 누워 쉬는 중'), '휴식');
 assert.equal(classifyActivity('점심 먹고 낮잠 15분'), '식사'); // '점심'이 먼저 매칭되거나 식사로 자연스럽게 처리

 assert.equal(classifyActivity('오늘 하루 정말 뿌듯하고 감사하다'), '감정');
});

test('불확실하거나 모호한 내용은 무리하게 추측하지 않고 기본 카테고리(일상)로 분류한다', () => {
 assert.equal(classifyActivity('집에 도착함'), '일상');
 assert.equal(classifyActivity('빨래 널고 청소함'), '일상');
 assert.equal(classifyActivity('그냥 멍하니 창밖 보기'), '일상');
 assert.equal(classifyActivity(''), '일상');
 assert.equal(classifyActivity(null), '일상');
});
