import re
import difflib

class Fuzz:
    @staticmethod
    def token_set_ratio(s1, s2):
        if not s1 or not s2:
            return 0
            
        def tokenize(s):
            return set(re.findall(r'\w+', str(s).lower()))
            
        tokens1 = tokenize(s1)
        tokens2 = tokenize(s2)
        
        intersection = tokens1.intersection(tokens2)
        diff1to2 = tokens1.difference(tokens2)
        diff2to1 = tokens2.difference(tokens1)
        
        sorted_intersection = ' '.join(sorted(intersection)).strip()
        sorted_diff1to2 = ' '.join(sorted(diff1to2)).strip()
        sorted_diff2to1 = ' '.join(sorted(diff2to1)).strip()
        
        t0 = sorted_intersection
        t1 = (sorted_intersection + ' ' + sorted_diff1to2).strip()
        t2 = (sorted_intersection + ' ' + sorted_diff2to1).strip()
        
        def get_ratio(a, b):
            if not a or not b:
                return 0
            return int(difflib.SequenceMatcher(None, a, b).ratio() * 100)
            
        ratios = []
        if t0:
            ratios.append(get_ratio(t0, t1))
            ratios.append(get_ratio(t0, t2))
            ratios.append(get_ratio(t1, t2))
            # In token_set_ratio, if one string is a subset of another, the score is high (often 100)
            ratios.append(100)
        else:
            ratios.append(get_ratio(t1, t2))
            
        return max(ratios) if ratios else 0

fuzz = Fuzz()
