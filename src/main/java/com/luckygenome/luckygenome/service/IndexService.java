package com.luckygenome.luckygenome.service;
import com.luckygenome.luckygenome.mapper.IndexMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;

@Service
public class IndexService {

    @Autowired
    IndexMapper indexMapper;

    public ArrayList<HashMap<String, Object>> findAll() {
        return indexMapper.findAll();
    }
}